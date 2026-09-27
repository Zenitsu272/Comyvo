import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireAdmin } from "@/lib/api";
import { adminActionSchema } from "@/lib/validation";
import { escapeHtml, sendEmail } from "@/lib/email";

export async function GET() {
  try {
    const { admin } = await requireAdmin();
    const [reportsResult, premiumResult, userCountResult, poolCountResult, premiumCountResult, usersResult] = await Promise.all([
      admin.from("reports").select("*,reporter:users!reports_reporter_id_fkey(roll_number,full_name),reported:users!reports_reported_user_id_fkey(roll_number,full_name),pool:pools!reports_pool_id_fkey(from_location,to_location)").order("created_at", { ascending: false }).limit(200),
      admin.from("premium_requests").select("*,user:users!premium_requests_user_id_fkey(full_name,roll_number,email)").eq("status", "pending").order("created_at"),
      admin.from("users").select("id", { count: "exact", head: true }),
      admin.from("pools").select("id", { count: "exact", head: true }),
      admin.from("users").select("id", { count: "exact", head: true }).eq("role", "premium"),
      admin.from("users").select("id,full_name,roll_number,email,role,status,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const error = reportsResult.error || premiumResult.error || userCountResult.error || poolCountResult.error || premiumCountResult.error || usersResult.error;
    if (error) throw error;
    return NextResponse.json({
      reports: reportsResult.data || [],
      premium_requests: premiumResult.data || [],
      users: usersResult.data || [],
      metrics: {
        users: userCountResult.count || 0,
        pools: poolCountResult.count || 0,
        premium_users: premiumCountResult.count || 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, admin } = await requireAdmin();
    await enforceRateLimit(request, "admin-action", 120, 60 * 60, user.id);
    const action = await parseJson(request, adminActionSchema);
    let targetId: string;
    if (action.action === "set_user_status") {
      if (action.userId === user.id && action.status === "suspended") return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });
      let hostedPools: Array<{ from_location: string; to_location: string; pool_members: Array<{ users: { email: string } | Array<{ email: string }> | null }> }> = [];
      if (action.status === "suspended") {
        const { data, error: poolsError } = await admin.from("pools")
          .select("from_location,to_location,pool_members(users!pool_members_user_id_fkey(email))")
          .eq("host_id", action.userId).in("status", ["active", "full"]).gt("departure_at", new Date().toISOString());
        if (poolsError) throw poolsError;
        hostedPools = (data || []) as typeof hostedPools;
      }
      const { error } = await admin.from("users").update({ status: action.status }).eq("id", action.userId).select("id").single();
      if (error) throw error;
      await Promise.allSettled(hostedPools.flatMap((pool) => pool.pool_members.map(async (member) => {
        const rider = Array.isArray(member.users) ? member.users[0] : member.users;
        if (!rider?.email) return;
        await sendEmail({
          to: rider.email,
          subject: "A Comyvo pool was cancelled",
          html: `<h2>Ride cancelled</h2><p>The ride from <strong>${escapeHtml(pool.from_location)}</strong> to <strong>${escapeHtml(pool.to_location)}</strong> was cancelled during a safety review.</p>`,
        });
      })));
      targetId = action.userId;
    } else if (action.action === "set_user_role") {
      if (action.userId === user.id && action.role !== "admin") return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
      const { error } = await admin.from("users").update({ role: action.role }).eq("id", action.userId).select("id").single();
      if (error) throw error;
      targetId = action.userId;
    } else if (action.action === "resolve_report") {
      const { error } = await admin.from("reports").update({ status: action.status, admin_note: action.note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", action.reportId).select("id").single();
      if (error) throw error;
      targetId = action.reportId;
    } else {
      const { data: premiumRequest, error } = await admin.from("premium_requests").update({ status: action.status, admin_note: action.note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", action.requestId).eq("status", "pending").select("user_id").single();
      if (error) throw error;
      if (action.status === "approved") {
        const { error: roleError } = await admin.from("users").update({ role: "premium" }).eq("id", premiumRequest.user_id).select("id").single();
        if (roleError) throw roleError;
      }
      targetId = action.requestId;
    }
    const { error: auditError } = await admin.from("audit_logs").insert({ actor_id: user.id, action: action.action, target_id: targetId, metadata: action });
    if (auditError) throw auditError;
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
