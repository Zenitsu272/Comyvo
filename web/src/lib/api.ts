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

export async function requireUser(): Promise<{
  user: User;
  profile: UserProfile;
  auth: Awaited<ReturnType<typeof createClient>>;
  admin: ReturnType<typeof createAdminClient>;
}> {
  const auth = await createClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) throw new ApiError(401, "Authentication required.");
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id,email,full_name,roll_number,phone,is_phone_verified,department,campus,gender,year_of_joining,role,status")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) throw new ApiError(403, "Complete your profile before continuing.");
  if (profile.status === "suspended") throw new ApiError(403, "This account has been suspended.");
  return { user, profile: profile as UserProfile, auth, admin };
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
  const rawKey = `${env.rateLimitSecret}:${bucket}:${identity || getRequestIp(request)}`;
  const key = createHash("sha256").update(rawKey).digest("hex");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new ApiError(503, "Rate-limit service is unavailable.");
  if (!data) throw new ApiError(429, "Too many requests. Please try again later.");
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (process.env.NODE_ENV !== "test") console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
