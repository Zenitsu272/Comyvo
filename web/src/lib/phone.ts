import "server-only";
import { getServerEnvironment } from "@/lib/env";

function twilioConfiguration() {
  const env = getServerEnvironment();
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioVerifyServiceSid) {
    throw new Error("Phone verification is not configured.");
  }
  return env;
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

export async function sendPhoneCode(phone: string): Promise<void> {
  await twilioRequest("Verifications", new URLSearchParams({ To: indianPhone(phone), Channel: "sms" }));
}

export async function verifyPhoneCode(phone: string, code: string): Promise<boolean> {
  const data = await twilioRequest("VerificationCheck", new URLSearchParams({ To: indianPhone(phone), Code: code }));
  return data.status === "approved";
}
