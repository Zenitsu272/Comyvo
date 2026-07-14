import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp, createDatabase } from "../server.js";

test("Comyvo supports authentication, profiles, pools, privacy, reports, and moderation", async (t) => {
  const db = createDatabase(":memory:");
  const app = createApp({
    db,
    environment: "test",
    otpSecret: "test-only-secret",
    adminEmails: "host1@cb.amrita.edu",
  });
  const server = createServer(app.handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    db.close();
  });

  async function request(path, { cookie, body, ...options } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    return { response, payload };
  }

  async function signIn(email, profile) {
    const sent = await request("/api/auth/request-otp", { method: "POST", body: { email } });
    assert.equal(sent.response.status, 201);
    assert.match(sent.payload.devCode, /^\d{6}$/);
    const verified = await request("/api/auth/verify-otp", {
      method: "POST",
      body: { email, code: sent.payload.devCode },
    });
    assert.equal(verified.response.status, 200);
    const cookie = verified.response.headers.get("set-cookie").split(";", 1)[0];
    if (profile) {
      const saved = await request("/api/profile", { method: "PUT", cookie, body: profile });
      assert.equal(saved.response.status, 200);
      assert.equal(saved.payload.user.profileComplete, true);
    }
    return cookie;
  }

  const hostCookie = await signIn("new.host@cb.amrita.edu", {
    fullName: "Devika Rao",
    rollNumber: "CB.EN.U4CSE26001",
    phone: "9876500001",
    department: "CSE",
    campus: "Coimbatore",
    gender: "female",
  });

  const departureAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const created = await request("/api/pools", {
    method: "POST",
    cookie: hostCookie,
    body: {
      origin: "Academic Block 1",
      destination: "Coimbatore Junction",
      departureAt,
      totalSeats: 2,
      costPerPerson: 125,
      notes: "Meet beside the security desk.",
      comfortPreference: "all",
    },
  });
  assert.equal(created.response.status, 201);
  const poolId = created.payload.id;

  const womenPool = await request("/api/pools", {
    method: "POST",
    cookie: hostCookie,
    body: {
      origin: "AB1",
      destination: "Airport",
      departureAt,
      totalSeats: 2,
      costPerPerson: 300,
      womenOnly: true,
      comfortPreference: "women",
    },
  });
  assert.equal(womenPool.response.status, 201);

  const riderCookie = await signIn("new.rider@cb.amrita.edu", {
    fullName: "Arjun Das",
    rollNumber: "CB.EN.U4CSE26002",
    phone: "9876500002",
    department: "CSE",
    campus: "Coimbatore",
    gender: "male",
  });

  const visibleBeforeJoin = await request("/api/pools", { cookie: riderCookie });
  assert.equal(visibleBeforeJoin.response.status, 200);
  assert.equal(visibleBeforeJoin.payload.pools.some((pool) => pool.id === womenPool.payload.id), false);
  const standardPool = visibleBeforeJoin.payload.pools.find((pool) => pool.id === poolId);
  assert.equal(standardPool.host.phoneVisible, false);
  assert.match(standardPool.host.phone, /^\*{8}/);

  const blockedJoin = await request(`/api/pools/${womenPool.payload.id}/join`, { method: "POST", cookie: riderCookie });
  assert.equal(blockedJoin.response.status, 403);

  const joined = await request(`/api/pools/${poolId}/join`, { method: "POST", cookie: riderCookie });
  assert.equal(joined.response.status, 200);
  const visibleAfterJoin = await request("/api/pools", { cookie: riderCookie });
  const joinedPool = visibleAfterJoin.payload.pools.find((pool) => pool.id === poolId);
  assert.equal(joinedPool.joined, true);
  assert.equal(joinedPool.host.phone, "9876500001");

  const report = await request(`/api/pools/${poolId}/reports`, {
    method: "POST",
    cookie: riderCookie,
    body: { reason: "Pickup details need moderator review." },
  });
  assert.equal(report.response.status, 201);

  const forbiddenCancel = await request(`/api/pools/${poolId}/cancel`, { method: "PATCH", cookie: riderCookie, body: {} });
  assert.equal(forbiddenCancel.response.status, 403);

  const adminCookie = await signIn("host1@cb.amrita.edu");
  const moderation = await request("/api/admin", { cookie: adminCookie });
  assert.equal(moderation.response.status, 200);
  const openReport = moderation.payload.reports.find((item) => item.reason.includes("moderator review"));
  assert.ok(openReport);
  const resolved = await request(`/api/admin/reports/${openReport.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { status: "resolved" },
  });
  assert.equal(resolved.response.status, 200);

  const cancelled = await request(`/api/pools/${poolId}/cancel`, { method: "PATCH", cookie: hostCookie, body: {} });
  assert.equal(cancelled.response.status, 200);
});

test("production database starts without demo users or pools", () => {
  const db = createDatabase(":memory:", { seed: false });
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM pools").get().count, 0);
  db.close();
});
