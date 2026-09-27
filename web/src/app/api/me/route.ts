import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, profileComplete, requireUser } from "@/lib/api";
import { deleteAccountSchema, profileSchema } from "@/lib/validation";
import { decodeAmritaEmail } from "@/lib/auth";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getServerEnvironment } from "@/lib/env";

export async function GET() {
  try {
    const { profile } = await requireUser();
    return NextResponse.json({ ...profile, profile_complete: profileComplete(profile), phone_verification_enabled: getServerEnvironment().phoneVerificationEnabled });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, profile, admin } = await requireUser();
    await enforceRateLimit(request, "profile-update", 20, 60 * 60, user.id);
    const input = await parseJson(request, profileSchema);
    const decoded = decodeAmritaEmail(user.email || profile.email);
    if (decoded.fullRollNumber && input.roll_number !== decoded.fullRollNumber) {
      return NextResponse.json({ error: "Roll number must match your verified college email." }, { status: 400 });
    }
    const phone = input.phone || null;
    const updates = {
      ...input,
      phone,
      department: decoded.departmentCode || input.department,
      campus: decoded.campus || input.campus,
      year_of_joining: decoded.yearOfJoining || input.year_of_joining || null,
      is_phone_verified: phone === profile.phone ? profile.is_phone_verified : false,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin.from("users").update(updates).eq("id", user.id).select().single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "That roll number is already registered." }, { status: 409 });
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, admin } = await requireUser();
    await enforceRateLimit(request, "account-delete", 3, 24 * 60 * 60, user.id);
    await parseJson(request, deleteAccountSchema);

    const { data: hostedPools, error: poolsError } = await admin.from("pools")
      .select("id,from_location,to_location,pool_members(users!pool_members_user_id_fkey(email))")
      .eq("host_id", user.id).in("status", ["active", "full"]);
    if (poolsError) throw poolsError;

    const { error: auditError } = await admin.from("audit_logs").insert({ actor_id: user.id, action: "delete_account", target_id: user.id });
    if (auditError) throw auditError;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    await Promise.allSettled((hostedPools || []).flatMap((pool) => (pool.pool_members || []).map(async (member) => {
      const rider = Array.isArray(member.users) ? member.users[0] : member.users;
      if (!rider?.email) return;
      await sendEmail({
        to: rider.email,
        subject: "A Comyvo pool was cancelled",
        html: `<h2>Ride cancelled</h2><p>The host closed their account, so the ride from <strong>${escapeHtml(pool.from_location)}</strong> to <strong>${escapeHtml(pool.to_location)}</strong> is no longer available.</p>`,
      });
    })));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
