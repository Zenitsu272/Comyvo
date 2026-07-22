import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerEnvironment } from "@/lib/env";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson } from "@/lib/api";
import { sendOtpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email } = await parseJson(request, sendOtpSchema);
    await enforceRateLimit(request, "otp-ip", 6, 15 * 60);
    await enforceRateLimit(request, "otp-email", 3, 15 * 60, email);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getServerEnvironment().siteUrl}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.error("Supabase OTP send failed:", error.code);
      return NextResponse.json({ error: "The verification email could not be sent. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
