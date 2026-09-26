import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: { otpDelivery: "resend", resendApiKey: "re_test", emailFrom: "Comyvo <login@example.com>", siteUrl: "http://127.0.0.1:3000", supabaseUrl: "http://127.0.0.1:55421" },
  generateLink: vi.fn(), signInWithOtp: vi.fn(), sendEmail: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getServerEnvironment: () => mocks.env }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({ auth: { admin: { generateLink: mocks.generateLink } } }),
  createClient: async () => ({ auth: { signInWithOtp: mocks.signInWithOtp } }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail, escapeHtml: (value: string) => value }));

import { sendLoginEmail } from "./login-email";

describe("login email delivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.env.otpDelivery = "resend";
    mocks.env.resendApiKey = "re_test";
    mocks.generateLink.mockResolvedValue({ data: { properties: { email_otp: "123456" } }, error: null });
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it("sends the Supabase code through Resend without returning the code", async () => {
    const result = await sendLoginEmail("student@amrita.edu");
    expect(result).toBe("email");
    expect(mocks.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "student@amrita.edu" });
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "student@amrita.edu", text: expect.stringContaining("123456") }), { required: true });
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it("fails before generating an OTP when the sender is unconfigured", async () => {
    mocks.env.resendApiKey = "";
    await expect(sendLoginEmail("student@amrita.edu")).rejects.toMatchObject({ status: 503 });
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not claim success when the provider rejects delivery", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sendEmail.mockRejectedValue(new Error("Email provider rejected the request (403)."));
    await expect(sendLoginEmail("student@amrita.edu")).rejects.toMatchObject({ status: 502 });
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    logger.mockRestore();
  });

  it("does not send unusable codes when Supabase is misconfigured", async () => {
    mocks.generateLink.mockResolvedValue({ data: { properties: { email_otp: "12345678" } }, error: null });
    await expect(sendLoginEmail("student@amrita.edu")).rejects.toMatchObject({ status: 502 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("labels an explicitly selected local Supabase inbox honestly", async () => {
    mocks.env.otpDelivery = "supabase";
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    await expect(sendLoginEmail("student@amrita.edu")).resolves.toBe("local_inbox");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
