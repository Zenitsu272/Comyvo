import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/pools/:id/join
export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check pool
  const { data: pool } = await supabase
    .from("pools")
    .select("available_seats, status, host_id, women_only")
    .eq("id", id)
    .single();

  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if (pool.host_id === user.id) return NextResponse.json({ error: "You can't join your own pool." }, { status: 400 });
  if (pool.status !== "active") return NextResponse.json({ error: "Pool is not available." }, { status: 400 });
  if (pool.available_seats <= 0) return NextResponse.json({ error: "Pool is full." }, { status: 400 });

  // Women-only check
  if (pool.women_only) {
    const { data: profile } = await supabase.from("users").select("gender").eq("id", user.id).single();
    if (profile?.gender !== "female") {
      return NextResponse.json({ error: "This pool is for women students only." }, { status: 403 });
    }
  }

  // Join
  const { error } = await supabase
    .from("pool_members")
    .insert({ pool_id: id, user_id: user.id });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "You have already joined this pool." }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
