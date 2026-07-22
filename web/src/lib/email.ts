import "server-only";
import { getServerEnvironment } from "@/lib/env";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<void> {
  const env = getServerEnvironment();
  if (!env.resendApiKey || !env.emailFrom) {
    if (process.env.NODE_ENV === "production") throw new Error("Email delivery is not configured.");
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, ...input }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status}).`);
}
