import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/me
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json(profile ?? {});
}

// PUT /api/me
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = ["full_name", "roll_number", "phone", "department", "gender", "campus"];
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("users")
    .upsert({ id: user.id, email: user.email!, ...updates })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
