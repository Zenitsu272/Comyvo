// Local-only pricing integration test. No email is sent; the temporary account is removed.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
const site = env.NEXT_PUBLIC_SITE_URL;
const database = env.NEXT_PUBLIC_SUPABASE_URL;
for (const url of [site, database]) {
  assert(url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname), "Local URLs required");
}
const admin = createClient(database, env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `cb.en.u4cce24${String(Date.now()).slice(-5)}@cb.students.amrita.edu`;
let userId;
let cookie = "";
async function request(path, method = "GET", body, expected = 200) {
  const response = await fetch(`${site}${path}`, {
    method,
    headers: { Origin: site, "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) cookie = cookies.map((value) => value.split(";")[0]).join("; ");
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

try {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  userId = data.user.id;
  await request("/api/auth/verify-otp", "POST", { email, token: data.properties.email_otp });
  await request("/api/me", "PUT", { full_name: "Pricing Test", roll_number: email.split("@")[0].toUpperCase(), department: "CCE", campus: "Coimbatore", gender: "male", year_of_joining: 2024 });
  const base = { from_location: "Pricing Test Gate", to_location: "Pricing Test Station", departure_at: new Date(Date.now() + 7200000).toISOString(), total_seats: 3, car_type: "auto", campus: "Coimbatore", luggage_capacity: "any", women_only: false, contact_visibility: "after_join" };
  const fixed = await request("/api/pools", "POST", { ...base, cost_per_person: 30 }, 201);
  assert.equal(fixed.pricing_mode, "fixed");
  assert.equal(Number(fixed.cost_per_person), 30);
  const split = await request("/api/pools", "POST", { ...base, pricing_mode: "split_equally", cost_per_person: null }, 201);
  assert.equal(split.pricing_mode, "split_equally");
  assert.equal(split.cost_per_person, null);
  const listing = await request("/api/pools?scope=mine");
  assert.equal(listing.find((pool) => pool.id === split.id).pricing_mode, "split_equally");
  const detail = await request(`/api/pools/${split.id}`);
  assert.equal(detail.cost_per_person, null);
  const edited = await request(`/api/pools/${fixed.id}`, "PUT", { pricing_mode: "split_equally" });
  assert.equal(edited.cost_per_person, null);
  await request(`/api/pools/${fixed.id}`, "PUT", { pricing_mode: "fixed" }, 400);
  const restored = await request(`/api/pools/${fixed.id}`, "PUT", { pricing_mode: "fixed", cost_per_person: 42.5 });
  assert.equal(Number(restored.cost_per_person), 42.5);
  const { error: constraintError } = await admin.from("pools").update({ pricing_mode: "split_equally", cost_per_person: 99 }).eq("id", fixed.id);
  assert(constraintError, "Database must reject inconsistent split pricing");
  console.log("PASS: fixed and equal-split creation, listing, details, edits, validation, and database constraint.");
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    console.log("Temporary pricing account and rides removed.");
  }
}
