import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, profileComplete, requireUser } from "@/lib/api";
import { joinPoolSchema } from "@/lib/validation";
import { escapeHtml, sendEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const { user, profile, auth, admin } = await requireUser();
    if (!profileComplete(profile)) return NextResponse.json({ error: "Complete your profile before joining a pool." }, { status: 403 });
    await enforceRateLimit(request, "pool-join", 30, 60 * 60, user.id);
    const { seat_no } = await parseJson(request, joinPoolSchema);
    const { error } = await auth.rpc("join_pool", { p_pool_id: id, p_seat_no: seat_no });
    if (error) {
      const message = error.message.includes("already") ? "You have already joined this pool."
        : error.message.includes("seat") ? error.message
          : error.message.includes("women") ? "This pool is for women students only."
            : "This pool can no longer be joined.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const { data: pool } = await admin.from("pools").select("from_location,to_location,host:users!pools_host_id_fkey(email,full_name)").eq("id", id).single();
    const host = Array.isArray(pool?.host) ? pool.host[0] : pool?.host;
    if (host?.email) {
      try {
        await sendEmail({
          to: host.email,
          subject: "A rider joined your Comyvo pool",
          html: `<h2>New rider joined</h2><p>${escapeHtml(profile.full_name || profile.roll_number || "A verified student")} booked seat ${seat_no} on your ride from <strong>${escapeHtml(pool?.from_location || "")}</strong> to <strong>${escapeHtml(pool?.to_location || "")}</strong>.</p>`,
        });
      } catch (emailError) {
        console.error("Join notification failed:", emailError);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
