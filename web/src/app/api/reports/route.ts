import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireUser } from "@/lib/api";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, admin } = await requireUser();
    await enforceRateLimit(request, "report", 5, 24 * 60 * 60, user.id);
    const report = await parseJson(request, reportSchema);
    if (report.reported_user_id === user.id) return NextResponse.json({ error: "You cannot report yourself." }, { status: 400 });
    const { data, error } = await admin.from("reports").insert({ ...report, reporter_id: user.id, status: "open", admin_note: null }).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
