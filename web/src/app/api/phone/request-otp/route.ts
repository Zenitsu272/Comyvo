import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireUser } from "@/lib/api";
import { phoneRequestSchema } from "@/lib/validation";
import { sendPhoneCode } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, profile } = await requireUser();
    const { phone } = await parseJson(request, phoneRequestSchema);
    if (profile.phone !== phone) return NextResponse.json({ error: "Save this phone number to your profile first." }, { status: 409 });
    await enforceRateLimit(request, "phone-send", 3, 60 * 60, user.id);
    await sendPhoneCode(phone);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
