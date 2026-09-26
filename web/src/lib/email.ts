import "server-only";
import { getServerEnvironment } from "@/lib/env";
import nodemailer from "nodemailer";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}

export async function sendEmail(input: { to: string; subject: string; html: string; text?: string }, options: { required?: boolean } = {}): Promise<void> {
  const env = getServerEnvironment();
  if (env.otpDelivery === "smtp") {
    if (!env.smtpHost || !env.smtpUser || !env.smtpPassword || !env.emailFrom) {
      throw new Error("SMTP email delivery is not configured.");
    }
    const transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      requireTLS: true,
      auth: { user: env.smtpUser, pass: env.smtpHost === "smtp.gmail.com" ? env.smtpPassword.replace(/\s/g, "") : env.smtpPassword },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      const result = await transport.sendMail({ from: env.emailFrom, ...input });
      if (!result.accepted?.length || result.rejected?.length) throw new Error("SMTP recipient rejected.");
    } catch {
      // Provider diagnostics can contain recipient addresses; do not surface them.
      throw new Error("SMTP delivery failed. Check the sender credentials and provider settings.");
    } finally {
      transport.close();
    }
    return;
  }
  if (!env.resendApiKey || !env.emailFrom) {
    if (options.required || process.env.NODE_ENV === "production") throw new Error("Email delivery is not configured.");
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, ...input }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status}).`);
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error("Email provider did not confirm message acceptance.");
}
