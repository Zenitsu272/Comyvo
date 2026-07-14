import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIR = join(HERE, "sample-frontends");
const COOKIE_NAME = "comyvo_session";
const JSON_LIMIT = 256 * 1024;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_LIFETIME_MS = 10 * 60 * 1000;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isoNow() {
  return new Date().toISOString();
}

function addHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashOtp(secret, email, code) {
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function safeEqual(a, b) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

function cleanText(value, label, { min = 1, max = 200 } = {}) {
  if (typeof value !== "string") throw new HttpError(400, `${label} is required.`);
  const result = value.trim().replace(/\s+/g, " ");
  if (result.length < min || result.length > max) {
    throw new HttpError(400, `${label} must be between ${min} and ${max} characters.`);
  }
  return result;
}

function isAmritaEmail(email) {
  return /^[^@\s]+@(?:[a-z0-9-]+\.)*amrita\.edu$/i.test(email);
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!isAmritaEmail(email)) {
    throw new HttpError(400, "Use an Amrita email address ending in amrita.edu.");
  }
  return email;
}

function validatePhone(value) {
  const phone = String(value || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new HttpError(400, "Enter a valid 10-digit Indian mobile number.");
  }
  return phone;
}

function isProfileComplete(user) {
  return Boolean(user?.full_name && user?.roll_number && user?.phone && user?.department && user?.campus && user?.gender);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    rollNumber: user.roll_number,
    phone: user.phone,
    department: user.department,
    campus: user.campus,
    gender: user.gender,
    phoneVerified: Boolean(user.phone_verified),
    premium: Boolean(user.premium),
    role: user.role,
    profileComplete: isProfileComplete(user),
  };
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, ...value]) => [key, decodeURIComponent(value.join("="))]),
  );
}

function sessionCookie(token, secure) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_LIFETIME_MS / 1000)}${secure ? "; Secure" : ""}`;
}

function clearSessionCookie(secure) {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(body);
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > JSON_LIMIT) throw new HttpError(413, "Request body is too large.");
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function mapPool(row, viewer = null) {
  const joined = Boolean(row.viewer_joined);
  const isHost = viewer?.id === row.host_id;
  const canSeePhone = Boolean(
    viewer && (isHost || joined || (viewer.premium && row.premium_contact_visible)),
  );
  const phone = row.host_phone || "";
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    departureAt: row.departure_at,
    totalSeats: row.total_seats,
    seatsAvailable: Math.max(0, row.total_seats - row.joined_count),
    joinedCount: row.joined_count,
    costPerPerson: row.cost_per_person,
    campus: row.campus,
    notes: row.notes,
    womenOnly: Boolean(row.women_only),
    comfortPreference: row.comfort_preference,
    premiumContactVisible: Boolean(row.premium_contact_visible),
    coRiderContactsVisible: Boolean(row.co_rider_contacts_visible),
    status: row.status,
    host: {
      id: row.host_id,
      name: row.host_name,
      rollNumber: row.host_roll_number,
      phone: canSeePhone ? phone : phone ? `********${phone.slice(-2)}` : "Not provided",
      phoneVisible: canSeePhone,
      phoneVerified: Boolean(row.host_phone_verified),
    },
    joined,
    isHost,
  };
}

function selectPools(db, where = "1 = 1", params = {}) {
  const statement = db.prepare(`
    SELECT
      p.*,
      u.full_name AS host_name,
      u.roll_number AS host_roll_number,
      u.phone AS host_phone,
      u.phone_verified AS host_phone_verified,
      COUNT(DISTINCT CASE WHEN pm.status = 'joined' THEN pm.user_id END) AS joined_count,
      MAX(CASE WHEN pm.user_id = $viewerId AND pm.status = 'joined' THEN 1 ELSE 0 END) AS viewer_joined
    FROM pools p
    JOIN users u ON u.id = p.host_id
    LEFT JOIN pool_members pm ON pm.pool_id = p.id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY p.departure_at ASC
  `);
  return statement.all({ $viewerId: params.$viewerId ?? -1, ...params });
}

export function createDatabase(databasePath = ":memory:", { seed = true } = {}) {
  if (databasePath !== ":memory:") mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  if (databasePath !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      full_name TEXT,
      roll_number TEXT UNIQUE COLLATE NOCASE,
      phone TEXT,
      department TEXT,
      campus TEXT,
      gender TEXT CHECK (gender IN ('female', 'male', 'other')),
      phone_verified INTEGER NOT NULL DEFAULT 0,
      premium INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL COLLATE NOCASE,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS otp_email_created_idx ON otp_codes(email, created_at DESC);

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_at TEXT NOT NULL,
      total_seats INTEGER NOT NULL CHECK (total_seats BETWEEN 1 AND 8),
      cost_per_person INTEGER NOT NULL CHECK (cost_per_person BETWEEN 0 AND 10000),
      campus TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      women_only INTEGER NOT NULL DEFAULT 0,
      comfort_preference TEXT NOT NULL DEFAULT 'all' CHECK (comfort_preference IN ('all', 'women', 'department', 'year')),
      premium_contact_visible INTEGER NOT NULL DEFAULT 0,
      co_rider_contacts_visible INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS pools_departure_idx ON pools(status, departure_at);

    CREATE TABLE IF NOT EXISTS pool_members (
      pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'left')),
      joined_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (pool_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  if (seed) seedDatabase(db);
  return db;
}

function seedDatabase(db) {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM pools").get().count;
  if (existing) return;
  const now = isoNow();
  const users = [
    ["host1@cb.amrita.edu", "Ananya Menon", "CB.EN.U4CCE24001", "9876543210", "CCE", "Coimbatore", "female", 1, 1, "admin"],
    ["host2@cb.amrita.edu", "Riya Kumar", "CB.EN.U4ECE23012", "9847012310", "ECE", "Coimbatore", "female", 1, 0, "user"],
    ["host3@ch.amrita.edu", "Meera Nair", "CH.EN.U4CSE25084", "9765432184", "CSE", "Chennai", "female", 0, 0, "user"],
  ];
  const insertUser = db.prepare(`
    INSERT INTO users (email, full_name, roll_number, phone, department, campus, gender, phone_verified, premium, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const user of users) insertUser.run(...user, now, now);

  const ids = db.prepare("SELECT id, email FROM users").all();
  const byEmail = Object.fromEntries(ids.map((row) => [row.email, row.id]));
  const insertPool = db.prepare(`
    INSERT INTO pools
      (host_id, origin, destination, departure_at, total_seats, cost_per_person, campus, notes, women_only, comfort_preference, premium_contact_visible, co_rider_contacts_visible, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPool.run(byEmail["host1@cb.amrita.edu"], "Campus Main Gate", "Coimbatore Railway Station", addHours(3.5), 3, 150, "Coimbatore", "Cab booked from the main gate. Please arrive 10 minutes early.", 0, "all", 1, 0, now, now);
  insertPool.run(byEmail["host2@cb.amrita.edu"], "AB3 Hostel", "Gandhipuram Bus Stand", addHours(20), 2, 110, "Coimbatore", "One small bag per rider, please.", 1, "women", 0, 0, now, now);
  insertPool.run(byEmail["host3@ch.amrita.edu"], "Campus Main Gate", "Coimbatore Airport", addHours(44), 4, 420, "Coimbatore", "Airport cab share. Flight timing is flexible by 15 minutes.", 0, "all", 0, 1, now, now);
}

async function deliverOtp({ email, code, resendApiKey, mailFrom }) {
  if (!resendApiKey) throw new HttpError(503, "Email delivery is not configured. Set RESEND_API_KEY and MAIL_FROM.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: mailFrom,
      to: [email],
      subject: `${code} is your Comyvo verification code`,
      text: `Your Comyvo verification code is ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!response.ok) throw new HttpError(502, "The verification email could not be sent. Please try again.");
}

export function createApp(options = {}) {
  const environment = options.environment || process.env.NODE_ENV || "development";
  const secureCookies = environment === "production";
  const publicDir = resolve(options.publicDir || DEFAULT_PUBLIC_DIR);
  const configuredOtpSecret = options.otpSecret || process.env.OTP_SECRET;
  if (environment === "production" && (!configuredOtpSecret || configuredOtpSecret.length < 32)) {
    throw new Error("OTP_SECRET must be set to at least 32 characters in production.");
  }
  const otpSecret = configuredOtpSecret || "comyvo-local-development-secret";
  const appOrigin = options.appOrigin || process.env.APP_ORIGIN || "";
  if (environment === "production" && !appOrigin) {
    throw new Error("APP_ORIGIN must be configured in production.");
  }
  const resendApiKey = options.resendApiKey ?? process.env.RESEND_API_KEY;
  const mailFrom = options.mailFrom || process.env.MAIL_FROM || "Comyvo <noreply@example.com>";
  const adminEmails = new Set(
    (options.adminEmails || process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const db = options.db || createDatabase(
    options.databasePath || process.env.DATABASE_PATH || join(HERE, "data", "comyvo.db"),
    { seed: environment !== "production" },
  );

  function getUser(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!token) return null;
    return db.prepare(`
      SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `).get(hash(token), isoNow()) || null;
  }

  function requireUser(req, { complete = false, admin = false } = {}) {
    const user = getUser(req);
    if (!user) throw new HttpError(401, "Sign in with your college email to continue.");
    if (complete && !isProfileComplete(user)) throw new HttpError(403, "Complete your profile before continuing.");
    if (admin && user.role !== "admin") throw new HttpError(403, "Administrator access is required.");
    return user;
  }

  function assertSameOrigin(req) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
    const origin = req.headers.origin;
    if (!origin) return;
    const allowed = appOrigin || `${secureCookies ? "https" : "http"}://${req.headers.host}`;
    if (origin !== allowed) throw new HttpError(403, "Cross-origin request rejected.");
  }

  async function api(req, res, url) {
    assertSameOrigin(req);
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(isoNow());
    db.prepare("DELETE FROM otp_codes WHERE expires_at <= ? OR (used_at IS NOT NULL AND used_at < ?)").run(isoNow(), new Date(Date.now() - 86400000).toISOString());

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { status: "ok", service: "comyvo", time: isoNow() });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/request-otp") {
      const { email: rawEmail } = await readJson(req);
      const email = normalizeEmail(rawEmail);
      const latest = db.prepare("SELECT created_at FROM otp_codes WHERE email = ? ORDER BY id DESC LIMIT 1").get(email);
      if (latest && Date.now() - Date.parse(latest.created_at) < 60000) {
        throw new HttpError(429, "Please wait one minute before requesting another code.");
      }
      const code = String(randomInt(100000, 1000000));
      const createdAt = isoNow();
      const insertedOtp = db.prepare("INSERT INTO otp_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)")
        .run(email, hashOtp(otpSecret, email, code), new Date(Date.now() + OTP_LIFETIME_MS).toISOString(), createdAt);
      const emailDeliveryEnabled = Boolean(resendApiKey);
      if (emailDeliveryEnabled || environment === "production") {
        try {
          await deliverOtp({ email, code, resendApiKey, mailFrom });
        } catch (error) {
          db.prepare("DELETE FROM otp_codes WHERE id = ?").run(insertedOtp.lastInsertRowid);
          throw error;
        }
      } else {
        console.info(`[Comyvo] Verification code for ${email}: ${code}`);
      }
      return sendJson(res, 201, {
        message: emailDeliveryEnabled
          ? `A verification code was sent to ${email}.`
          : "Development code generated locally. Email delivery is not configured.",
        delivery: emailDeliveryEnabled ? "email" : "development",
        ...(!emailDeliveryEnabled && environment !== "production" ? { devCode: code } : {}),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/verify-otp") {
      const body = await readJson(req);
      const email = normalizeEmail(body.email);
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit verification code.");
      const otp = db.prepare("SELECT * FROM otp_codes WHERE email = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1").get(email);
      if (!otp || Date.parse(otp.expires_at) <= Date.now()) throw new HttpError(400, "That code has expired. Request a new one.");
      if (otp.attempts >= 5) throw new HttpError(429, "Too many attempts. Request a new code.");
      const valid = safeEqual(otp.code_hash, hashOtp(otpSecret, email, code));
      if (!valid) {
        db.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(otp.id);
        throw new HttpError(400, "The verification code is incorrect.");
      }
      db.prepare("UPDATE otp_codes SET used_at = ? WHERE id = ?").run(isoNow(), otp.id);
      const role = adminEmails.has(email) ? "admin" : "user";
      db.prepare("INSERT INTO users (email, role) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET role = CASE WHEN excluded.role = 'admin' THEN 'admin' ELSE users.role END").run(email, role);
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      const token = randomBytes(32).toString("base64url");
      db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
        .run(hash(token), user.id, new Date(Date.now() + SESSION_LIFETIME_MS).toISOString(), isoNow());
      return sendJson(res, 200, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(token, secureCookies) });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
      if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(token));
      return sendJson(res, 200, { message: "Signed out." }, { "Set-Cookie": clearSessionCookie(secureCookies) });
    }

    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      return sendJson(res, 200, { user: publicUser(getUser(req)) });
    }

    if (req.method === "PUT" && url.pathname === "/api/profile") {
      const user = requireUser(req);
      const body = await readJson(req);
      const fullName = cleanText(body.fullName, "Full name", { min: 2, max: 80 });
      const rollNumber = cleanText(body.rollNumber, "Roll number", { min: 6, max: 32 }).toUpperCase();
      if (!/^[A-Z0-9.-]+$/.test(rollNumber)) throw new HttpError(400, "Roll number contains unsupported characters.");
      const phone = validatePhone(body.phone);
      const department = cleanText(body.department, "Department", { min: 2, max: 50 }).toUpperCase();
      const campus = cleanText(body.campus, "Campus", { min: 2, max: 50 });
      const gender = ["female", "male", "other"].includes(body.gender) ? body.gender : null;
      if (!gender) throw new HttpError(400, "Select a gender to support pool privacy rules.");
      const conflict = db.prepare("SELECT id FROM users WHERE roll_number = ? AND id != ?").get(rollNumber, user.id);
      if (conflict) throw new HttpError(409, "That roll number is already registered.");
      db.prepare(`
        UPDATE users SET full_name = ?, roll_number = ?, phone = ?, department = ?, campus = ?, gender = ?, updated_at = ?
        WHERE id = ?
      `).run(fullName, rollNumber, phone, department, campus, gender, isoNow(), user.id);
      return sendJson(res, 200, { user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)), message: "Profile saved." });
    }

    if (req.method === "GET" && url.pathname === "/api/pools") {
      const viewer = getUser(req);
      const clauses = ["p.status = 'active'", "p.departure_at > $now"];
      const params = { $viewerId: viewer?.id ?? -1, $now: isoNow() };
      const destination = url.searchParams.get("destination")?.trim();
      const origin = url.searchParams.get("origin")?.trim();
      const date = url.searchParams.get("date")?.trim();
      if (viewer?.gender !== "female") clauses.push("p.women_only = 0");
      if (destination) { clauses.push("p.destination LIKE $destination"); params.$destination = `%${destination}%`; }
      if (origin) { clauses.push("p.origin LIKE $origin"); params.$origin = `%${origin}%`; }
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const timezoneOffset = Number(url.searchParams.get("timezoneOffset"));
        const offset = Number.isFinite(timezoneOffset) && Math.abs(timezoneOffset) <= 840 ? timezoneOffset : 0;
        const [year, month, day] = date.split("-").map(Number);
        const start = new Date(Date.UTC(year, month - 1, day) + offset * 60000);
        clauses.push("p.departure_at >= $dateStart AND p.departure_at < $dateEnd");
        params.$dateStart = start.toISOString();
        params.$dateEnd = new Date(start.getTime() + 86400000).toISOString();
      }
      const rows = selectPools(db, clauses.join(" AND "), params);
      return sendJson(res, 200, { pools: rows.map((row) => mapPool(row, viewer)) });
    }

    if (req.method === "POST" && url.pathname === "/api/pools") {
      const user = requireUser(req, { complete: true });
      const body = await readJson(req);
      const origin = cleanText(body.origin, "Starting point", { min: 2, max: 100 });
      const destination = cleanText(body.destination, "Destination", { min: 2, max: 100 });
      const departure = new Date(body.departureAt);
      if (!Number.isFinite(departure.getTime()) || departure.getTime() < Date.now() + 15 * 60000) {
        throw new HttpError(400, "Departure must be at least 15 minutes from now.");
      }
      const totalSeats = Number(body.totalSeats);
      const cost = Number(body.costPerPerson);
      if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > 8) throw new HttpError(400, "Seats must be between 1 and 8.");
      if (!Number.isInteger(cost) || cost < 0 || cost > 10000) throw new HttpError(400, "Cost must be a whole number between 0 and 10,000.");
      const womenOnly = Boolean(body.womenOnly);
      if (womenOnly && user.gender !== "female") throw new HttpError(403, "Only women can host a women-only pool.");
      const comfort = ["all", "women", "department", "year"].includes(body.comfortPreference) ? body.comfortPreference : "all";
      const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
      const result = db.prepare(`
        INSERT INTO pools (host_id, origin, destination, departure_at, total_seats, cost_per_person, campus, notes, women_only, comfort_preference, premium_contact_visible, co_rider_contacts_visible, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(user.id, origin, destination, departure.toISOString(), totalSeats, cost, user.campus, notes, womenOnly ? 1 : 0, comfort, body.premiumContactVisible ? 1 : 0, body.coRiderContactsVisible ? 1 : 0, isoNow(), isoNow());
      return sendJson(res, 201, { id: Number(result.lastInsertRowid), message: "Pool published." });
    }

    const joinMatch = url.pathname.match(/^\/api\/pools\/(\d+)\/join$/);
    if (req.method === "POST" && joinMatch) {
      const user = requireUser(req, { complete: true });
      const poolId = Number(joinMatch[1]);
      db.exec("BEGIN IMMEDIATE");
      try {
        const pool = db.prepare(`
          SELECT p.*, COUNT(CASE WHEN pm.status = 'joined' THEN 1 END) AS joined_count
          FROM pools p LEFT JOIN pool_members pm ON pm.pool_id = p.id WHERE p.id = ? GROUP BY p.id
        `).get(poolId);
        if (!pool) throw new HttpError(404, "Pool not found.");
        if (pool.host_id === user.id) throw new HttpError(409, "You are the host of this pool.");
        if (pool.status !== "active" || Date.parse(pool.departure_at) <= Date.now()) throw new HttpError(409, "This pool is no longer active.");
        if (pool.joined_count >= pool.total_seats) throw new HttpError(409, "This pool is full.");
        if (pool.women_only && user.gender !== "female") throw new HttpError(403, "This pool is available only to women students.");
        db.prepare(`
          INSERT INTO pool_members (pool_id, user_id, status, joined_at, updated_at) VALUES (?, ?, 'joined', ?, ?)
          ON CONFLICT(pool_id, user_id) DO UPDATE SET status = 'joined', updated_at = excluded.updated_at
        `).run(poolId, user.id, isoNow(), isoNow());
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return sendJson(res, 200, { message: "You joined the pool. Host contact is now unlocked." });
    }

    const leaveMatch = url.pathname.match(/^\/api\/pools\/(\d+)\/membership$/);
    if (req.method === "DELETE" && leaveMatch) {
      const user = requireUser(req, { complete: true });
      const result = db.prepare("UPDATE pool_members SET status = 'left', updated_at = ? WHERE pool_id = ? AND user_id = ? AND status = 'joined'")
        .run(isoNow(), Number(leaveMatch[1]), user.id);
      if (!result.changes) throw new HttpError(404, "You have not joined this pool.");
      return sendJson(res, 200, { message: "You left the pool." });
    }

    const cancelMatch = url.pathname.match(/^\/api\/pools\/(\d+)\/cancel$/);
    if (req.method === "PATCH" && cancelMatch) {
      const user = requireUser(req, { complete: true });
      const pool = db.prepare("SELECT * FROM pools WHERE id = ?").get(Number(cancelMatch[1]));
      if (!pool) throw new HttpError(404, "Pool not found.");
      if (pool.host_id !== user.id && user.role !== "admin") throw new HttpError(403, "Only the host can cancel this pool.");
      if (pool.status !== "active") throw new HttpError(409, "This pool has already been closed.");
      db.prepare("UPDATE pools SET status = 'cancelled', updated_at = ? WHERE id = ?").run(isoNow(), pool.id);
      return sendJson(res, 200, { message: "Pool cancelled." });
    }

    if (req.method === "GET" && url.pathname === "/api/my-pools") {
      const user = requireUser(req, { complete: true });
      const created = selectPools(db, "p.host_id = $userId", { $viewerId: user.id, $userId: user.id });
      const joined = selectPools(db, "EXISTS (SELECT 1 FROM pool_members mine WHERE mine.pool_id = p.id AND mine.user_id = $userId AND mine.status = 'joined')", { $viewerId: user.id, $userId: user.id });
      const memberStatement = db.prepare(`
        SELECT u.id, u.full_name, u.roll_number, u.phone
        FROM pool_members pm JOIN users u ON u.id = pm.user_id
        WHERE pm.pool_id = ? AND pm.status = 'joined' ORDER BY pm.joined_at
      `);
      return sendJson(res, 200, {
        created: created.map((row) => ({ ...mapPool(row, user), members: memberStatement.all(row.id).map((member) => ({ id: member.id, fullName: member.full_name, rollNumber: member.roll_number, phone: member.phone })) })),
        joined: joined.map((row) => mapPool(row, user)),
      });
    }

    const reportMatch = url.pathname.match(/^\/api\/pools\/(\d+)\/reports$/);
    if (req.method === "POST" && reportMatch) {
      const user = requireUser(req, { complete: true });
      const pool = db.prepare("SELECT id FROM pools WHERE id = ?").get(Number(reportMatch[1]));
      if (!pool) throw new HttpError(404, "Pool not found.");
      const { reason } = await readJson(req);
      const cleanReason = cleanText(reason, "Report reason", { min: 8, max: 500 });
      db.prepare("INSERT INTO reports (pool_id, reporter_id, reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run(pool.id, user.id, cleanReason, isoNow(), isoNow());
      return sendJson(res, 201, { message: "Report submitted for review." });
    }

    if (req.method === "GET" && url.pathname === "/api/admin") {
      requireUser(req, { admin: true });
      const metrics = {
        activePools: db.prepare("SELECT COUNT(*) AS value FROM pools WHERE status = 'active' AND departure_at > ?").get(isoNow()).value,
        openReports: db.prepare("SELECT COUNT(*) AS value FROM reports WHERE status = 'open'").get().value,
        users: db.prepare("SELECT COUNT(*) AS value FROM users").get().value,
        premium: db.prepare("SELECT COUNT(*) AS value FROM users WHERE premium = 1").get().value,
      };
      const reports = db.prepare(`
        SELECT r.id, r.reason, r.status, r.created_at, p.origin, p.destination, u.roll_number AS reporter_roll_number
        FROM reports r JOIN pools p ON p.id = r.pool_id JOIN users u ON u.id = r.reporter_id
        ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC
      `).all().map((row) => ({ id: row.id, reason: row.reason, status: row.status, createdAt: row.created_at, origin: row.origin, destination: row.destination, reporterRollNumber: row.reporter_roll_number }));
      return sendJson(res, 200, { metrics, reports });
    }

    const reportActionMatch = url.pathname.match(/^\/api\/admin\/reports\/(\d+)$/);
    if (req.method === "PATCH" && reportActionMatch) {
      requireUser(req, { admin: true });
      const { status } = await readJson(req);
      if (!["resolved", "dismissed"].includes(status)) throw new HttpError(400, "Status must be resolved or dismissed.");
      const result = db.prepare("UPDATE reports SET status = ?, updated_at = ? WHERE id = ?").run(status, isoNow(), Number(reportActionMatch[1]));
      if (!result.changes) throw new HttpError(404, "Report not found.");
      return sendJson(res, 200, { message: `Report ${status}.` });
    }

    throw new HttpError(404, "API route not found.");
  }

  function staticFile(req, res, url) {
    if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Method not allowed.");
    const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const filePath = resolve(publicDir, normalize(requested));
    if (!filePath.startsWith(`${publicDir}${sep}`) && filePath !== join(publicDir, "index.html")) throw new HttpError(403, "Invalid file path.");
    const finalPath = existsSync(filePath) && statSync(filePath).isFile() ? filePath : join(publicDir, "index.html");
    const contentType = MIME_TYPES[extname(finalPath).toLowerCase()] || "application/octet-stream";
    const stats = statSync(finalPath);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": extname(finalPath) === ".html" ? "no-cache" : "public, max-age=3600",
      "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      "Referrer-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(finalPath).pipe(res);
  }

  const handler = async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) await api(req, res, url);
      else staticFile(req, res, url);
    } catch (error) {
      if (res.headersSent) return res.end();
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(res, status, { error: status === 500 ? "Something went wrong on the server." : error.message });
    }
  };

  return { handler, db };
}

export function startServer(options = {}) {
  const app = createApp(options);
  const server = createServer(app.handler);
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  server.listen(port, options.host || "127.0.0.1", () => {
    const address = server.address();
    console.info(`Comyvo is running at http://127.0.0.1:${address.port}`);
  });
  return { server, db: app.db };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer();
