// Explicitly upload only application variables; never upload the DB password or local bypass.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

if (!process.argv.includes("--confirm-production")) throw new Error("Pass --confirm-production to configure the Comyvo Vercel project.");
const env = parseEnv(readFileSync(".env.production.local", "utf8"));
env.TEMPORARY_LOGIN_ENABLED ??= "false";
const names = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "RATE_LIMIT_SECRET", "OTP_DELIVERY", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM", "PHONE_VERIFICATION_ENABLED", "TEMPORARY_LOGIN_ENABLED"];
if (env.NEXT_PUBLIC_SITE_URL !== "https://comyvo.vercel.app" || env.NEXT_PUBLIC_SUPABASE_URL !== "https://rofjssxpgzgxmqirdlfy.supabase.co") throw new Error("Unexpected production target.");
if (env.LOCAL_PHONE_OTP || env.PHONE_VERIFICATION_ENABLED !== "false") throw new Error("Expected email-only production configuration.");
for (const name of names) {
  if (!env[name]) throw new Error(`Missing ${name}`);
  const result = spawnSync("npx.cmd", ["--yes", "vercel@60.1.3", "env", "add", name, "production", "--project", "comyvo", "--scope", "zenitsu272s-projects", "--force", "--yes", name.startsWith("NEXT_PUBLIC_") ? "--no-sensitive" : "--sensitive"], { input: env[name], encoding: "utf8", shell: true });
  if (result.status !== 0) {
    let diagnostic = `${result.stdout || ""}\n${result.stderr || ""}`;
    for (const value of Object.values(env)) if (value) diagnostic = diagnostic.split(value).join("[redacted]");
    throw new Error(`Upload failed for ${name}: ${diagnostic}`);
  }
  console.log(`Configured ${name}`);
}
