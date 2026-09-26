import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, profileComplete, requireUser } from "@/lib/api";
import { createPoolSchema } from "@/lib/validation";

type HostRecord = { id: string; full_name: string | null; roll_number: string | null; phone: string | null; is_phone_verified: boolean };
type PoolRecord = Record<string, unknown> & { id: string; host_id: string; contact_visibility: string; women_only: boolean; host: HostRecord | HostRecord[] | null };

function cleanSearch(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/[^\p{L}\p{N} .'-]/gu, "").slice(0, 80);
  return cleaned || null;
}

function poolResponse(pool: PoolRecord, viewer: { id: string; role: string }, memberships: Set<string>) {
  const host = Array.isArray(pool.host) ? pool.host[0] : pool.host;
  const isHost = pool.host_id === viewer.id;
  const isMember = memberships.has(pool.id);
  const phoneVisible = Boolean(host && (
    isHost || isMember || viewer.role === "admin" || pool.contact_visibility === "always" ||
    (pool.contact_visibility === "premium_only" && viewer.role === "premium")
  ));
  const phone = host?.phone || "";
  const { host: _host, ...rest } = pool;
  void _host;
  return {
    ...rest,
    host_name: host?.full_name ?? null,
    host_roll: host?.roll_number ?? null,
    host_phone_verified: Boolean(host?.is_phone_verified),
    host_phone_masked: phone ? `********${phone.slice(-2)}` : "Not provided",
    host_phone_full: phoneVisible ? phone : null,
    is_member: isMember,
    is_host: isHost,
    viewer_role: viewer.role,
  };
}

export async function GET(request: Request) {
  try {
    const { user, profile, admin } = await requireUser();
    const { error: lifecycleError } = await admin.rpc("reconcile_expired_pools");
    if (lifecycleError) throw lifecycleError;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const membershipQuery = admin.from("pool_members").select("pool_id").eq("user_id", user.id);
    const { data: membershipRows } = await membershipQuery;
    const memberships = new Set((membershipRows || []).map((row) => row.pool_id as string));
    let query = admin.from("pools").select("*, host:users!pools_host_id_fkey(id,full_name,roll_number,phone,is_phone_verified)");

    if (scope === "mine") {
      const ids = [...memberships];
      query = ids.length
        ? query.or(`host_id.eq.${user.id},id.in.(${ids.join(",")})`)
        : query.eq("host_id", user.id);
    } else {
      query = query.in("status", ["active", "full"]).gte("departure_at", new Date().toISOString());
      if (profile.gender !== "female") query = query.eq("women_only", false);
      const to = cleanSearch(searchParams.get("to"));
      const from = cleanSearch(searchParams.get("from"));
      const date = searchParams.get("date");
      const campus = cleanSearch(searchParams.get("campus"));
      const carType = searchParams.get("car_type");
      if (to) query = query.or(`to_location.ilike.%${to}%,via_route.ilike.%${to}%`);
      if (from) query = query.ilike("from_location", `%${from}%`);
      if (campus) query = query.eq("campus", campus);
      if (["auto", "sedan", "suv"].includes(carType || "")) query = query.eq("car_type", carType!);
      if (searchParams.get("women_only") === "true") query = query.eq("women_only", true);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const offset = Math.max(-840, Math.min(840, Number(searchParams.get("timezone_offset")) || 0));
        const [year, month, day] = date.split("-").map(Number);
        const start = new Date(Date.UTC(year, month - 1, day) + offset * 60_000);
        query = query.gte("departure_at", start.toISOString()).lt("departure_at", new Date(start.getTime() + 86_400_000).toISOString());
      }
    }
    const { data, error } = await query.order("departure_at", { ascending: true }).limit(scope === "mine" ? 100 : 50);
    if (error) throw error;
    return NextResponse.json((data as PoolRecord[] || []).map((pool) => poolResponse(pool, { id: user.id, role: profile.role }, memberships)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, profile, admin } = await requireUser();
    if (!profileComplete(profile)) return NextResponse.json({ error: "Complete your profile before hosting a pool." }, { status: 403 });
    await enforceRateLimit(request, "pool-create", 10, 24 * 60 * 60, user.id);
    const pool = await parseJson(request, createPoolSchema);
    if (pool.women_only && profile.gender !== "female") {
      return NextResponse.json({ error: "Only women students can host a women-only pool." }, { status: 403 });
    }
    const { data, error } = await admin.from("pools").insert({
      ...pool,
      host_id: user.id,
      available_seats: pool.total_seats - 1,
      via_route: pool.via_route || null,
      notes: pool.notes || null,
      status: "active",
    }).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
