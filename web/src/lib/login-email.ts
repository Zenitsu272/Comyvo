import "server-only";
import { ApiError } from "@/lib/api";
import { getServerEnvironment } from "@/lib/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { escapeHtml, sendEmail } from "@/lib/email";
import { isTemporaryLoginEnabled } from "@/lib/login-mode";

export async function sendLoginEmail(email: string): Promise<"email" | "local_inbox" | "temporary_code"> {
  if (isTemporaryLoginEnabled()) return "temporary_code";
  const env = getServerEnvironment();
  if (env.otpDelivery === "supabase") {
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(new URL(env.supabaseUrl).hostname);
    if (local && process.env.NODE_ENV === "production") {
      throw new ApiError(503, "Email delivery is not configured for this deployment.");
    }
    const auth = await createClient();
    const { error } = await auth.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${env.siteUrl}/auth/callback`, shouldCreateUser: true },
    });
    if (error) throw new ApiError(502, "The verification email could not be sent. Please try again.");
    return local ? "local_inbox" : "email";
  }

  // Never generate a code or report a successful send without a configured sender.
  const configured = env.emailFrom && (env.otpDelivery === "smtp"
    ? env.smtpHost && env.smtpUser && env.smtpPassword
    : env.resendApiKey && !/replace_me|placeholder/.test(env.resendApiKey + env.emailFrom));
  if (!configured) {
    throw new ApiError(503, "Email sending is not set up yet. The Comyvo administrator needs to configure a sending account.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const code = data?.properties?.email_otp;
  if (error || !code || !/^\d{6}$/.test(code)) {
    throw new ApiError(502, "Could not create a verification code. Please try again.");
  }

  try {
    await sendEmail({
      to: email,
      subject: "Your Comyvo verification code",
      text: `Your Comyvo verification code is ${code}. Enter it in the sign-in page. Do not share this code. If you did not request it, ignore this email.`,
      html: `<main style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#111"><p style="color:#087f5b;font-weight:700">COMYVO</p><h1>Your verification code</h1><p>Enter this six-digit code in the sign-in page:</p><p style="font-size:34px;font-weight:800;letter-spacing:.2em">${escapeHtml(code)}</p><p>Do not share this code. If you did not request it, ignore this email.</p></main>`,
    }, { required: true });
  } catch (error) {
    // Log only the safe provider status, never the generated token or response body.
    console.error("OTP email delivery failed:", error instanceof Error ? error.message : "Provider unavailable");
    throw new ApiError(502, "The email provider could not accept your verification email. Please try again or contact the Comyvo administrator.");
  }
  return "email";
}
