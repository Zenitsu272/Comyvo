import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import type { User } from "@supabase/supabase-js";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getServerEnvironment } from "@/lib/env";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  roll_number: string | null;
  phone: string | null;
  is_phone_verified: boolean;
  department: string | null;
  campus: string | null;
  gender: "female" | "male" | "other" | null;
  year_of_joining: number | null;
  role: "student" | "premium" | "admin";
  status: "active" | "suspended";
};

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64 * 1024) throw new ApiError(413, "Request body is too large.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, result.error.issues[0]?.message || "Invalid request.");
  }
  return result.data;
}

export function assertSameOrigin(request: Request): void {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin && origin !== getServerEnvironment().siteUrl) throw new ApiError(403, "Cross-origin request rejected.");
}

import { cookies } from "next/headers";

export async function requireUser(allowIncomplete = false): Promise<{
  user: User;
  profile: UserProfile;
  auth: Awaited<ReturnType<typeof createClient>>;
  admin: ReturnType<typeof createAdminClient>;
}> {
  const isDev = process.env.NODE_ENV !== "production";
  const auth = await createClient();
  let { data: { user }, error } = await auth.auth.getUser();

  if ((error || !user) && isDev) {
    try {
      const cookieStore = await cookies();
      let devUserId = cookieStore.get("dev_user_id")?.value;
      let devEmail = cookieStore.get("dev_email")?.value;

      if (!devUserId || !devEmail) {
        devUserId = "dev-user-00000000-0000-4000-a000-000000000001";
        devEmail = "cb.en.u4cce24130@cb.students.amrita.edu";
        cookieStore.set("dev_user_id", devUserId, { path: "/", maxAge: 86400 * 7, sameSite: "lax" });
        cookieStore.set("dev_email", devEmail, { path: "/", maxAge: 86400 * 7, sameSite: "lax" });
      }

      user = { id: devUserId, email: devEmail } as User;
      error = null;
    } catch {
      // ignore
    }
  }

  if (error || !user) throw new ApiError(401, "Authentication required.");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id,email,full_name,roll_number,phone,is_phone_verified,department,campus,gender,year_of_joining,role,status")
    .eq("id", user.id)
    .maybeSingle();

  const userProfile: UserProfile = (profile as UserProfile) || {
    id: user.id,
    email: user.email || "",
    full_name: null,
    roll_number: null,
    phone: null,
    is_phone_verified: false,
    department: null,
    campus: null,
    gender: null,
    year_of_joining: null,
    role: "student",
    status: "active",
  };

  if (!allowIncomplete && !profileComplete(userProfile)) {
    throw new ApiError(403, "Complete your profile before continuing.");
  }
  if (userProfile.status === "suspended") {
    throw new ApiError(403, "This account has been suspended.");
  }

  return { user, profile: userProfile, auth, admin };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.profile.role !== "admin") throw new ApiError(403, "Administrator access required.");
  return context;
}

export function profileComplete(profile: UserProfile): boolean {
  return Boolean(profile.full_name && profile.roll_number && profile.department && profile.campus);
}

export function getRequestIp(request: Request): string {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

export async function enforceRateLimit(request: Request, bucket: string, limit: number, windowSeconds: number, identity?: string): Promise<void> {
  const env = getServerEnvironment();
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && (env.supabaseServiceRoleKey === "dev_dummy_service_role_key" || !env.supabaseServiceRoleKey)) {
    return;
  }
  const rawKey = `${env.rateLimitSecret}:${bucket}:${identity || getRequestIp(request)}`;
  const key = createHash("sha256").update(rawKey).digest("hex");
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      if (isDev) {
        console.warn("Rate-limit check skipped in dev:", error.message);
        return;
      }
      throw new ApiError(503, "Rate-limit service is unavailable.");
    }
    if (!data) throw new ApiError(429, "Too many requests. Please try again later.");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isDev) {
      console.warn("Rate-limit exception skipped in dev:", err);
      return;
    }
    throw new ApiError(503, "Rate-limit service is unavailable.");
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (process.env.NODE_ENV !== "test") console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
