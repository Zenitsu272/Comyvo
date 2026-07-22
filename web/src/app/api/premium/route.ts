import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireUser } from "@/lib/api";
import { premiumRequestSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { user, profile, admin } = await requireUser();
    const { data: request } = await admin.from("premium_requests").select("id,status,created_at,admin_note").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({ role: profile.role, full_name: profile.full_name, request: request || null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, profile, admin } = await requireUser();
    if (profile.role !== "student") return NextResponse.json({ error: "Your account already has elevated access." }, { status: 409 });
    await enforceRateLimit(request, "premium-request", 2, 7 * 24 * 60 * 60, user.id);
    const { note } = await parseJson(request, premiumRequestSchema);
    const { data: existing } = await admin.from("premium_requests").select("id").eq("user_id", user.id).eq("status", "pending").maybeSingle();
    if (existing) return NextResponse.json({ error: "A premium request is already pending." }, { status: 409 });
    const { data, error } = await admin.from("premium_requests").insert({ user_id: user.id, note: note || null, status: "pending" }).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
