import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireAdmin } from "@/lib/api";
import { adminActionSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { admin } = await requireAdmin();
    const [{ data: reports, error }, { data: premiumRequests }, { count: users }, { count: pools }, { count: premiumUsers }] = await Promise.all([
      admin.from("reports").select("*,reporter:users!reports_reporter_id_fkey(roll_number,full_name),reported:users!reports_reported_user_id_fkey(roll_number,full_name),pool:pools!reports_pool_id_fkey(from_location,to_location)").order("created_at", { ascending: false }).limit(200),
      admin.from("premium_requests").select("*,user:users!premium_requests_user_id_fkey(full_name,roll_number,email)").eq("status", "pending").order("created_at"),
      admin.from("users").select("id", { count: "exact", head: true }),
      admin.from("pools").select("id", { count: "exact", head: true }),
      admin.from("users").select("id", { count: "exact", head: true }).eq("role", "premium"),
    ]);
    if (error) throw error;
    return NextResponse.json({ reports: reports || [], premium_requests: premiumRequests || [], metrics: { users: users || 0, pools: pools || 0, premium_users: premiumUsers || 0 } });
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
      const { error } = await admin.from("users").update({ status: action.status }).eq("id", action.userId);
      if (error) throw error;
      targetId = action.userId;
    } else if (action.action === "set_user_role") {
      const { error } = await admin.from("users").update({ role: action.role }).eq("id", action.userId);
      if (error) throw error;
      targetId = action.userId;
    } else if (action.action === "resolve_report") {
      const { error } = await admin.from("reports").update({ status: action.status, admin_note: action.note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", action.reportId);
      if (error) throw error;
      targetId = action.reportId;
    } else {
      const { data: premiumRequest, error } = await admin.from("premium_requests").update({ status: action.status, admin_note: action.note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", action.requestId).eq("status", "pending").select("user_id").single();
      if (error) throw error;
      if (action.status === "approved") await admin.from("users").update({ role: "premium" }).eq("id", premiumRequest.user_id);
      targetId = action.requestId;
    }
    await admin.from("audit_logs").insert({ actor_id: user.id, action: action.action, target_id: targetId, metadata: action });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
