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
    const isDev = process.env.NODE_ENV !== "production";
    const supabase = await createClient();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${getServerEnvironment().siteUrl}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) {
        console.error("Supabase OTP send failed:", error.code, error.message);
        if (isDev) {
          console.log(`[DEV MODE] OTP fallback active for ${email}. Dev code: 123456`);
          return NextResponse.json({ success: true, devMode: true });
        }
        return NextResponse.json({ error: "The verification email could not be sent. Please try again." }, { status: 502 });
      }
    } catch (err) {
      console.warn("Supabase OTP send network call failed:", err);
      if (isDev) {
        console.log(`[DEV MODE] Offline OTP fallback active for ${email}. Dev code: 123456`);
        return NextResponse.json({ success: true, devMode: true });
      }
      return NextResponse.json({ error: "The verification email could not be sent. Please try again." }, { status: 502 });
    }
    if (isDev) {
      console.log(`[DEV MODE] OTP sent to ${email}. You can also use dev code: 123456`);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
