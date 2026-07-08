import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/pools — list with filters
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("pools_public")
    .select("*")
    .in("status", ["active", "full"])
    .order("departure_at", { ascending: true });

  const to = searchParams.get("to");
  const from = searchParams.get("from");
  const date = searchParams.get("date");
  const womenOnly = searchParams.get("women_only");
  const campus = searchParams.get("campus");

  // If a destination is searched, match EITHER to_location OR via_route!
  if (to) {
    query = query.or(`to_location.ilike.%${to}%,via_route.ilike.%${to}%`);
  }
  if (from) {
    query = query.ilike("from_location", `%${from}%`);
  }
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    query = query.gte("departure_at", start.toISOString()).lt("departure_at", end.toISOString());
  }
  if (womenOnly === "true") query = query.eq("women_only", true);
  if (campus) query = query.eq("campus", campus);

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get member IDs for this user
  const poolIds = (data ?? []).map((p) => p.id);
  const { data: memberships } = poolIds.length
    ? await supabase.from("pool_members").select("pool_id").eq("user_id", user.id).in("pool_id", poolIds)
    : { data: [] };

  const memberSet = new Set((memberships ?? []).map((m) => m.pool_id));

  // Get user role
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  const enriched = (data ?? []).map((pool) => ({
    ...pool,
    is_member: memberSet.has(pool.id),
    is_host: pool.host_id === user.id,
    viewer_role: profile?.role ?? "student",
    host_phone_full:
      (profile?.role === "admin") ||
      (pool.contact_visibility === "always") ||
      (pool.contact_visibility === "premium_only" && profile?.role === "premium") ||
      memberSet.has(pool.id) ||
      pool.host_id === user.id
        ? pool.host_phone_masked
        : null,
  }));

  return NextResponse.json(enriched);
}

// POST /api/pools — create
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    from_location, to_location, via_route, departure_at,
    total_seats, cost_per_person, notes,
    campus, women_only, contact_visibility,
  } = body;

  if (!from_location || !to_location || !departure_at || !total_seats || !cost_per_person) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pools")
    .insert({
      host_id: user.id,
      from_location,
      to_location,
      via_route: via_route || null,
      departure_at,
      total_seats: Number(total_seats),
      available_seats: Number(total_seats),
      cost_per_person: Number(cost_per_person),
      notes,
      campus: campus ?? "Coimbatore",
      women_only: women_only ?? false,
      contact_visibility: contact_visibility ?? "after_join",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
