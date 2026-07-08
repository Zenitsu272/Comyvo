import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/verify-otp
export async function POST(request: Request) {
  const { email, token } = await request.json();

  if (!email || !token) {
    return NextResponse.json({ error: "Email and token are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  // Check if profile is complete
  const { data: profile } = await supabase
    .from("users")
    .select("roll_number, full_name")
    .eq("id", data.user!.id)
    .single();

  const isProfileComplete = !!(profile?.roll_number && profile?.full_name);

  return NextResponse.json({ success: true, isProfileComplete });
}
