import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: vi.fn(), generateLink: vi.fn(), verifyOtp: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mocks.verifyOtp } }),
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    auth: { admin: { generateLink: mocks.generateLink } },
  }),
}));
import { verifyLoginCode } from "./verify-login";
import { isTemporaryLoginEnabled } from "./login-mode";

describe("temporary email sign-in", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("TEMPORARY_LOGIN_ENABLED", "true");
    mocks.profile.mockResolvedValue({ data: null, error: null });
    mocks.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "server-only-token" } }, error: null });
    mocks.verifyOtp.mockResolvedValue({ data: { user: { id: "student" } }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("requires an exact opt-in, including in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isTemporaryLoginEnabled()).toBe(true);
    for (const value of ["", "false", "TRUE", "1"]) {
      vi.stubEnv("TEMPORARY_LOGIN_ENABLED", value);
      expect(isTemporaryLoginEnabled()).toBe(false);
    }
  });
  it.each(["signup", "magiclink"])("redeems a server-generated %s token using email verification", async (type) => {
    mocks.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "server-only-token", verification_type: type } }, error: null });
    await verifyLoginCode("student@amrita.edu", "123456");
    expect(mocks.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "student@amrita.edu" });
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "server-only-token", type: "email" });
  });
  it("rejects other codes before touching accounts", async () => {
    await expect(verifyLoginCode("student@amrita.edu", "000000")).rejects.toMatchObject({ status: 400 });
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });
  it("rejects non-Amrita addresses", async () => {
    await expect(verifyLoginCode("student@example.com", "123456")).rejects.toMatchObject({ status: 400 });
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it.each([
    { role: "admin", status: "active" },
    { role: "student", status: "suspended" },
  ])("blocks restricted accounts: %j", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    await expect(verifyLoginCode("student@amrita.edu", "123456")).rejects.toMatchObject({ status: 403 });
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });
  it("fails closed when account checks fail", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(verifyLoginCode("student@amrita.edu", "123456")).rejects.toMatchObject({ status: 503 });
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it("fails closed when session token generation fails", async () => {
    mocks.generateLink.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(verifyLoginCode("student@amrita.edu", "123456")).rejects.toMatchObject({ status: 502 });
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });
  it("restores genuine OTP verification when the switch is off", async () => {
    vi.stubEnv("TEMPORARY_LOGIN_ENABLED", "false");
    await verifyLoginCode("student@amrita.edu", "123456");
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ email: "student@amrita.edu", token: "123456", type: "email" });
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
  });
});
