import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decodeAmritaEmail } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/users/:id — fetch public profile and ride statistics
export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch target user profile
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "User profile not found." }, { status: 404 });
  }

  // Derived details from their email (campus, course, program, department, batch)
  const decoded = decodeAmritaEmail(profile.email);

  // Fetch count of hosted pools
  const { count: hostedCount, error: hostErr } = await supabase
    .from("pools")
    .select("*", { count: "exact", head: true })
    .eq("host_id", id);

  // Fetch count of joined pools
  const { count: joinedCount, error: joinErr } = await supabase
    .from("pool_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", id);

  return NextResponse.json({
    id: profile.id,
    full_name: profile.full_name,
    roll_number: profile.roll_number,
    department: profile.department,
    campus: profile.campus,
    gender: profile.gender,
    year_of_joining: profile.year_of_joining,
    role: profile.role,
    is_phone_verified: profile.is_phone_verified,
    email: profile.email,
    decoded,
    stats: {
      hosted: hostedCount ?? 0,
      joined: joinedCount ?? 0,
    }
  });
}
