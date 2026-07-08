import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/reports — file a report against a user or pool
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { reported_user_id, pool_id, reason } = body;

  if (!reason) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      reported_user_id: reported_user_id || null,
      pool_id: pool_id || null,
      reason,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
