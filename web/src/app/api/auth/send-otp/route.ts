import { NextResponse } from "next/server";
import { sendLoginEmail } from "@/lib/login-email";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson } from "@/lib/api";
import { sendOtpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email } = await parseJson(request, sendOtpSchema);
    await enforceRateLimit(request, "otp-ip", 6, 15 * 60);
    await enforceRateLimit(request, "otp-email", 3, 15 * 60, email);
    const delivery = await sendLoginEmail(email);
    return NextResponse.json({ success: true, delivery });
  } catch (error) {
    return handleApiError(error);
  }
}
