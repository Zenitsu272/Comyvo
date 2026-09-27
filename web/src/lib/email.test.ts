import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: { otpDelivery: "smtp", smtpHost: "smtp.gmail.com", smtpPort: 465, smtpUser: "sender@gmail.com", smtpPassword: "abcd efgh ijkl mnop", emailFrom: "Comyvo <sender@gmail.com>", resendApiKey: "re_test" },
  sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getServerEnvironment: () => mocks.env }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
import { sendEmail } from "./email";

const message = { to: "student@amrita.edu", subject: "Verification", html: "<p>123456</p>" };
describe("email transport", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.env.otpDelivery = "smtp";
    mocks.env.smtpPassword = "abcd efgh ijkl mnop";
    mocks.env.smtpPort = 465;
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail, close: mocks.close });
    mocks.sendMail.mockResolvedValue({ accepted: [message.to], rejected: [] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses authenticated TLS and accepts a Gmail app password with spaces", async () => {
    await sendEmail(message, { required: true });
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      secure: true, requireTLS: true, auth: { user: "sender@gmail.com", pass: "abcdefghijklmnop" },
    }));
    expect(mocks.sendMail).toHaveBeenCalledWith({ from: mocks.env.emailFrom, ...message });
    expect(mocks.close).toHaveBeenCalled();
  });

  it("requires STARTTLS for port 587", async () => {
    mocks.env.smtpPort = 587;
    await sendEmail(message);
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: false, requireTLS: true }));
  });

  it("fails on missing credentials without making a connection", async () => {
    mocks.env.smtpPassword = "";
    await expect(sendEmail(message, { required: true })).rejects.toThrow("not configured");
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it("fails when SMTP does not accept the recipient and closes the connection", async () => {
    mocks.sendMail.mockResolvedValue({ accepted: [], rejected: [message.to] });
    await expect(sendEmail(message)).rejects.toThrow("SMTP delivery failed");
    expect(mocks.close).toHaveBeenCalled();
  });

  it("fails when Resend rejects a request", async () => {
    mocks.env.otpDelivery = "resend";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
    await expect(sendEmail(message, { required: true })).rejects.toThrow("403");
  });

  it("requires a Resend message ID before confirming acceptance", async () => {
    mocks.env.otpDelivery = "resend";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    await expect(sendEmail(message, { required: true })).rejects.toThrow("did not confirm");
  });
});
