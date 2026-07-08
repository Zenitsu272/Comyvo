import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDomainError } from "@/lib/auth";

// POST /api/auth/send-otp
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const domainError = getDomainError(email);
  if (domainError) {
    return NextResponse.json({ error: domainError }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
