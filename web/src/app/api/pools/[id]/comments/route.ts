import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/pools/:id/comments — load coordination chat
export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: comments, error } = await supabase
    .from("comments")
    .select("*, users(roll_number, full_name)")
    .eq("pool_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(comments || []);
}

// POST /api/pools/:id/comments — post message in chat
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await request.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message content required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      pool_id: id,
      user_id: user.id,
      message: message.trim(),
    })
    .select("*, users(roll_number, full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
