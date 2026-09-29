// Explicitly opted-in smoke test. Uses a fresh fixture only and removes it afterwards.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const site = process.env.NEXT_PUBLIC_SITE_URL;
const database = process.env.NEXT_PUBLIC_SUPABASE_URL;
const local = [site, database].every((url) => url && ["localhost", "127.0.0.1"].includes(new URL(url).hostname));
assert(local || (process.argv.includes("--confirm-production") && site === "https://comyvo.vercel.app" && database === "https://rofjssxpgzgxmqirdlfy.supabase.co"), "Unexpected target or missing production confirmation");
assert.equal(process.env.TEMPORARY_LOGIN_ENABLED, "true", "Temporary mode must be explicitly enabled");
const admin = createClient(database, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `temporary-smoke-${randomUUID()}@amrita.edu`;
let cookie = "";
let userId;

async function request(path, method = "GET", body, expected = 200) {
  const response = await fetch(`${site}${path}`, {
    method, headers: { Origin: site, "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const values = response.headers.getSetCookie();
  if (values.length) cookie = values.map((value) => value.split(";")[0]).join("; ");
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, got ${response.status}`);
  return data;
}

try {
  const login = await fetch(`${site}/login`, { signal: AbortSignal.timeout(30000) });
  assert.equal(login.status, 200);
  assert.match(await login.text(), /Temporary access/);
  const start = await request("/api/auth/send-otp", "POST", { email });
  assert.equal(start.delivery, "temporary_code");
  await request("/api/auth/verify-otp", "POST", { email, token: "000000" }, 400);
  await request("/api/auth/verify-otp", "POST", { email: "invalid@example.com", token: "123456" }, 400);
  const signedIn = await request("/api/auth/verify-otp", "POST", { email, token: "123456" });
  assert.equal(signedIn.success, true);
  assert.equal(signedIn.isProfileComplete, false);
  assert(cookie.includes("auth-token"), "Expected real session cookies");
  const profile = await request("/api/me");
  assert.equal(profile.email, email);
  userId = profile.id;
  console.log("PASS: new account, 123456 sign-in, session cookies, profile access, wrong code and domain rejection");
  cookie = "";
  await request("/api/auth/verify-otp", "POST", { email, token: "123456" });
  console.log("PASS: existing student sign-in");
  for (const fields of [{ role: "admin", status: "active" }, { role: "student", status: "suspended" }]) {
    const { error } = await admin.from("users").update(fields).eq("id", userId).eq("email", email);
    assert.equal(error, null);
    cookie = "";
    await request("/api/auth/verify-otp", "POST", { email, token: "123456" }, 403);
    assert.equal(cookie, "", "Restricted sign-in must not create cookies");
  }
  console.log("PASS: admin and suspended accounts blocked");
} finally {
  const { data, error: lookupError } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  assert.equal(lookupError, null, "Fixture cleanup lookup failed");
  if (data) {
    const { error } = await admin.auth.admin.deleteUser(data.id);
    assert.equal(error, null, "Fixture cleanup failed");
    console.log("Temporary fixture removed.");
  }
}
