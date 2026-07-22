import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireUser } from "@/lib/api";
import { phoneVerifySchema } from "@/lib/validation";
import { verifyPhoneCode } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, profile, admin } = await requireUser();
    const { phone, code } = await parseJson(request, phoneVerifySchema);
    if (profile.phone !== phone) return NextResponse.json({ error: "Phone number does not match your profile." }, { status: 409 });
    await enforceRateLimit(request, "phone-verify", 10, 60 * 60, user.id);
    if (!await verifyPhoneCode(phone, code)) return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    const { error } = await admin.from("users").update({ is_phone_verified: true }).eq("id", user.id).eq("phone", phone);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
