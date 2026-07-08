import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/pools/:id
export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pool, error } = await supabase
    .from("pools_public")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });

  const { data: membership } = await supabase
    .from("pool_members")
    .select("id")
    .eq("pool_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase.from("users").select("role, phone").eq("id", user.id).single();
  const isMember = !!membership;
  const isHost = pool.host_id === user.id;

  // Fetch actual host phone if allowed
  let hostPhoneFull: string | null = null;
  if (
    isHost || isMember ||
    pool.contact_visibility === "always" ||
    (pool.contact_visibility === "premium_only" && profile?.role === "premium") ||
    profile?.role === "admin"
  ) {
    const { data: hostUser } = await supabase.from("users").select("phone").eq("id", pool.host_id).single();
    hostPhoneFull = hostUser?.phone ?? null;
  }

  // Get members (roll numbers, no phone)
  const { data: members } = await supabase
    .from("pool_members")
    .select("user_id, users(roll_number, full_name)")
    .eq("pool_id", id);

  return NextResponse.json({
    ...pool,
    is_member: isMember,
    is_host: isHost,
    viewer_role: profile?.role ?? "student",
    host_phone_full: hostPhoneFull,
    members: members ?? [],
  });
}

// PUT /api/pools/:id — update (host only)
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = ["from_location", "to_location", "via_route", "departure_at", "total_seats", "cost_per_person", "notes", "women_only", "contact_visibility", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("pools")
    .update(updates)
    .eq("id", id)
    .eq("host_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/pools/:id — cancel (host only)
export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("pools")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
