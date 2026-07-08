import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, supabase: null };
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Forbidden", status: 403, supabase: null };
  return { error: null, status: 200, supabase };
}

// GET /api/admin/reports
export async function GET() {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });

  const { data, error: dbError } = await supabase
    .from("reports")
    .select("*, reporter:reporter_id(roll_number, full_name), reported:reported_user_id(roll_number, full_name), pool:pool_id(from_location, to_location)")
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

// GET /api/admin/users (all users)
export async function POST(request: Request) {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });

  const { action, userId, reportId, note } = await request.json();

  if (action === "suspend") {
    const { error: e } = await supabase.from("users").update({ role: "student" }).eq("id", userId);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "approve_premium") {
    const { error: e } = await supabase.from("users").update({ role: "premium" }).eq("id", userId);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "resolve_report") {
    const { error: e } = await supabase
      .from("reports")
      .update({ status: "resolved", admin_note: note ?? null })
      .eq("id", reportId);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
