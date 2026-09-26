import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const values = {};
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    values[line.slice(0, separator)] = line.slice(separator + 1).replace(/^['"]|['"]$/g, "");
  }
  return values;
}

const env = { ...loadEnv(resolve(".env.local")), ...process.env };
const siteUrl = env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const mailpitUrl = env.LOCAL_MAILPIT_URL || "http://127.0.0.1:55424";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(siteUrl)) throw new Error("e2e:local only runs against localhost.");
if (!supabaseUrl || !serviceKey) throw new Error("Supabase URL and server key are required in .env.local.");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(supabaseUrl)) throw new Error("e2e:local refuses to use a remote Supabase project.");

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = String(Date.now()).slice(-5);
const hostEmail = `cb.en.u4cce26${suffix}@cb.students.amrita.edu`;
const riderEmail = `cb.en.u4cse26${suffix}@cb.students.amrita.edu`;
const createdUserIds = [];

function cookieSession() {
  const jar = new Map();
  return {
    header() { return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; "); },
    update(headers) {
      const values = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
      for (const value of values) {
        const [pair] = value.split(";");
        const separator = pair.indexOf("=");
        if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    },
  };
}

async function request(path, { method = "GET", session, body, expected = [200] } = {}) {
  const response = await fetch(`${siteUrl}${path}`, {
    method,
    headers: {
      Origin: siteUrl,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(session?.header() ? { Cookie: session.header() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  session?.update(response.headers);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} returned ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return { response, data };
}

async function waitForOtp(email) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages`);
    if (!response.ok) throw new Error(`Mailpit returned ${response.status}.`);
    const payload = await response.json();
    const messages = Array.isArray(payload) ? payload : payload.messages || payload.Messages || [];
    const summary = messages.find((message) => JSON.stringify(message).toLowerCase().includes(email.toLowerCase()));
    if (summary) {
      const id = summary.ID || summary.Id || summary.id;
      const detailResponse = await fetch(`${mailpitUrl}/api/v1/message/${encodeURIComponent(id)}`);
      if (!detailResponse.ok) throw new Error(`Mailpit message lookup returned ${detailResponse.status}.`);
      const detail = await detailResponse.json();
      const body = [detail.Text, detail.HTML, detail.TextBody, detail.HTMLBody, detail.Raw?.Data].filter(Boolean).join(" ");
      const match = body.match(/(?<!\d)(\d{6})(?!\d)/);
      if (match) return match[1];
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 400));
  }
  throw new Error(`No verification email reached Mailpit for ${email}.`);
}

function rollFor(email) {
  return email.split("@")[0].toUpperCase();
}

async function signInAndCompleteProfile(email, name, gender, phone) {
  const session = cookieSession();
  await request("/api/auth/send-otp", { method: "POST", body: { email } });
  const token = await waitForOtp(email);
  await request("/api/auth/verify-otp", { method: "POST", session, body: { email, token } });
  const { data: profile } = await request("/api/me", {
    method: "PUT",
    session,
    body: {
      full_name: name,
      roll_number: rollFor(email),
      phone,
      department: "CCE",
      gender,
      campus: "Coimbatore",
      year_of_joining: 2026,
    },
  });
  createdUserIds.push(profile.id);
  return { session, profile };
}

async function main() {
  console.log("1/9 Checking application health");
  await request("/api/health");

  console.log("2/9 Delivering and verifying real local email OTPs");
  const host = await signInAndCompleteProfile(hostEmail, "E2E Host", "female", "9876543210");
  const rider = await signInAndCompleteProfile(riderEmail, "E2E Rider", "female", "9876543211");

  const { error: promoteError } = await admin.from("users").update({ role: "admin" }).eq("id", host.profile.id);
  if (promoteError) throw promoteError;

  console.log("3/9 Creating and discovering a pool");
  const departure = new Date(Date.now() + 4 * 60 * 60_000).toISOString();
  const { data: pool } = await request("/api/pools", {
    method: "POST",
    session: host.session,
    expected: [201],
    body: {
      from_location: "Amrita Coimbatore Campus",
      to_location: "Coimbatore Junction",
      via_route: "Ettimadai",
      car_type: "sedan",
      departure_at: departure,
      total_seats: 4,
      cost_per_person: 250,
      notes: "Local end-to-end verification ride",
      campus: "Coimbatore",
      luggage_capacity: "backpacks",
      women_only: false,
      contact_visibility: "after_join",
    },
  });
  const { data: discovery } = await request("/api/pools", { session: rider.session });
  if (!discovery.some((item) => item.id === pool.id)) throw new Error("Created pool was not discoverable.");

  console.log("4/9 Reserving a seat atomically and opening discussion");
  await request(`/api/pools/${pool.id}/join`, { method: "POST", session: rider.session, body: { seat_no: 2 } });
  const { data: joinedPool } = await request(`/api/pools/${pool.id}`, { session: rider.session });
  if (!joinedPool.is_member || joinedPool.available_seats !== 2) throw new Error("Seat reservation state is incorrect.");
  await request(`/api/pools/${pool.id}/comments`, { method: "POST", session: rider.session, expected: [201], body: { message: "E2E discussion works." } });

  console.log("5/9 Reporting and resolving through moderation");
  const { data: report } = await request("/api/reports", { method: "POST", session: rider.session, expected: [201], body: { pool_id: pool.id, reported_user_id: host.profile.id, reason: "Automated end-to-end moderation check." } });
  const { data: consoleData } = await request("/api/admin/reports", { session: host.session });
  if (!consoleData.reports.some((item) => item.id === report.id) || !consoleData.users.some((item) => item.id === rider.profile.id)) throw new Error("Moderation data is incomplete.");
  await request("/api/admin/reports", { method: "POST", session: host.session, body: { action: "resolve_report", reportId: report.id, status: "resolved", note: "Verified by local E2E." } });

  console.log("6/9 Exercising role and suspension controls");
  await request("/api/admin/reports", { method: "POST", session: host.session, body: { action: "set_user_role", userId: rider.profile.id, role: "premium" } });
  await request("/api/admin/reports", { method: "POST", session: host.session, body: { action: "set_user_status", userId: rider.profile.id, status: "suspended" } });
  await request("/api/me", { session: rider.session, expected: [403] });
  await request("/api/admin/reports", { method: "POST", session: host.session, body: { action: "set_user_status", userId: rider.profile.id, status: "active" } });
  const { data: afterSuspension } = await request(`/api/pools/${pool.id}`, { session: rider.session });
  if (afterSuspension.is_member || afterSuspension.available_seats !== 3) throw new Error("Suspension did not release the rider's future seat.");
  await request(`/api/pools/${pool.id}/join`, { method: "POST", session: rider.session, body: { seat_no: 2 } });

  console.log("7/9 Leaving the pool and enforcing discussion access");
  await request(`/api/pools/${pool.id}/leave`, { method: "DELETE", session: rider.session });
  await request(`/api/pools/${pool.id}/comments`, { session: rider.session, expected: [403] });

  console.log("8/9 Cancelling the hosted pool");
  await request(`/api/pools/${pool.id}`, { method: "DELETE", session: host.session });
  const { data: cancelled } = await request(`/api/pools/${pool.id}`, { session: host.session });
  if (cancelled.status !== "cancelled") throw new Error("Pool cancellation was not persisted.");

  console.log("9/9 Permanently deleting an account");
  await request("/api/me", { method: "DELETE", session: rider.session, body: { confirmation: "DELETE" } });
  const { data: deletedUser } = await admin.from("users").select("id").eq("id", rider.profile.id).maybeSingle();
  if (deletedUser) throw new Error("Account deletion did not cascade to the profile.");
  createdUserIds.splice(createdUserIds.indexOf(rider.profile.id), 1);

  console.log("PASS: Comyvo local end-to-end flow completed successfully.");
}

try {
  await main();
} finally {
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const cleanupIds = new Set([
    ...createdUserIds,
    ...(authData?.users || []).filter((user) => user.email === hostEmail || user.email === riderEmail).map((user) => user.id),
  ]);
  for (const id of cleanupIds) await admin.auth.admin.deleteUser(id);
}
