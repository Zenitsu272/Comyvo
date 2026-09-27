import "server-only";
import { getServerEnvironment } from "@/lib/env";
import { ApiError } from "@/lib/api";

function assertPhoneEnabled() {
  if (!getServerEnvironment().phoneVerificationEnabled) {
    throw new ApiError(503, "Phone verification is not available. Sign in using your college email.");
  }
}

function twilioConfiguration() {
  const env = getServerEnvironment();
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioVerifyServiceSid) {
    throw new Error("Phone verification is not configured.");
  }
  return env;
}

function localDevelopmentCode(): string | undefined {
  const env = getServerEnvironment();
  if (process.env.NODE_ENV === "production" || !env.localPhoneOtp) return undefined;
  const siteHost = new URL(env.siteUrl).hostname;
  const supabaseHost = new URL(env.supabaseUrl).hostname;
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!localHosts.has(siteHost) || !localHosts.has(supabaseHost) || !/^\d{4,10}$/.test(env.localPhoneOtp)) return undefined;
  return env.localPhoneOtp;
}

async function twilioRequest(path: string, values: URLSearchParams): Promise<Record<string, unknown>> {
  const env = twilioConfiguration();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${env.twilioVerifyServiceSid}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: values,
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error("Phone verification provider rejected the request.");
  return data;
}

export function indianPhone(phone: string): string {
  return `+91${phone}`;
}

export async function sendPhoneCode(phone: string): Promise<{ developmentCode?: string }> {
  assertPhoneEnabled();
  const developmentCode = localDevelopmentCode();
  if (developmentCode) return { developmentCode };
  await twilioRequest("Verifications", new URLSearchParams({ To: indianPhone(phone), Channel: "sms" }));
  return {};
}

export async function verifyPhoneCode(phone: string, code: string): Promise<boolean> {
  assertPhoneEnabled();
  const developmentCode = localDevelopmentCode();
  if (developmentCode) return code === developmentCode;
  const data = await twilioRequest("VerificationCheck", new URLSearchParams({ To: indianPhone(phone), Code: code }));
  return data.status === "approved";
}
