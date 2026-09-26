import "server-only";

type ServerEnvironment = {
  siteUrl: string;
  supabaseUrl: string;
  supabasePublicKey: string;
  supabaseServiceRoleKey: string;
  rateLimitSecret: string;
  resendApiKey?: string;
  emailFrom?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioVerifyServiceSid?: string;
  localPhoneOtp?: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function validUrl(name: string, value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
}

export function getServerEnvironment(): ServerEnvironment {
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = validUrl(
    "NEXT_PUBLIC_SITE_URL",
    required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
  );

  return {
    siteUrl,
    supabaseUrl: validUrl(
      "NEXT_PUBLIC_SUPABASE_URL",
      required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    ),
    supabasePublicKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
      publicKey,
    ),
    supabaseServiceRoleKey: required(
      "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
      serviceKey,
    ),
    rateLimitSecret: required("RATE_LIMIT_SECRET", process.env.RATE_LIMIT_SECRET),
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    localPhoneOtp: process.env.LOCAL_PHONE_OTP,
  };
}

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;
  const env = getServerEnvironment();
  if (env.rateLimitSecret.length < 32) {
    throw new Error("RATE_LIMIT_SECRET must be at least 32 characters in production.");
  }
  if (!env.resendApiKey || !env.emailFrom) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM are required in production.");
  }
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioVerifyServiceSid) {
    throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID are required in production.");
  }
  if (env.localPhoneOtp) throw new Error("LOCAL_PHONE_OTP must never be configured in production.");
}
