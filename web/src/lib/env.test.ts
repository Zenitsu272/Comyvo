import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertProductionEnvironment, getServerEnvironment } from "@/lib/env";

describe("email-only production configuration", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TEMPORARY_LOGIN_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://comyvo.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
    vi.stubEnv("RATE_LIMIT_SECRET", "x".repeat(32));
    vi.stubEnv("OTP_DELIVERY", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_USER", "test");
    vi.stubEnv("SMTP_PASSWORD", "test");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("EMAIL_FROM", "test@example.com");
    vi.stubEnv("PHONE_VERIFICATION_ENABLED", "false");
    vi.stubEnv("LOCAL_PHONE_OTP", "");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", "");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("starts without Twilio when phone verification is disabled", () => {
    expect(getServerEnvironment().phoneVerificationEnabled).toBe(false);
    expect(assertProductionEnvironment).not.toThrow();
  });
  it("still requires email credentials", () => {
    vi.stubEnv("SMTP_PASSWORD", "");
    expect(assertProductionEnvironment).toThrow(/email provider/);
  });
  it("allows the explicitly approved temporary mode without email credentials", () => {
    vi.stubEnv("TEMPORARY_LOGIN_ENABLED", "true");
    vi.stubEnv("SMTP_PASSWORD", "");
    expect(assertProductionEnvironment).not.toThrow();
  });
  it("requires Twilio when phone verification is enabled", () => {
    vi.stubEnv("PHONE_VERIFICATION_ENABLED", "true");
    expect(assertProductionEnvironment).toThrow(/TWILIO/);
  });
  it("always rejects development phone bypasses in production", () => {
    vi.stubEnv("LOCAL_PHONE_OTP", "123456");
    expect(assertProductionEnvironment).toThrow(/LOCAL_PHONE_OTP/);
  });
});
