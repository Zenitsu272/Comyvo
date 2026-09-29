import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson } from "@/lib/api";
import { verifyOtpSchema } from "@/lib/validation";
import { verifyLoginCode } from "@/lib/verify-login";
import { isTemporaryLoginEnabled } from "@/lib/login-mode";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email, token } = await parseJson(request, verifyOtpSchema);
    await enforceRateLimit(request, "otp-verify", 10, 15 * 60, email);
    const supabase = await createClient();
    const { data, error } = await verifyLoginCode(email, token, supabase);
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }
    const admin = createAdminClient();
    const { error: saveError } = await admin.from("users").upsert({ id: data.user.id, email: data.user.email || email }, { onConflict: "id", ignoreDuplicates: true });
    const { data: profile, error: profileError } = await admin.from("users").select("roll_number,full_name,status,role").eq("id", data.user.id).single();
    if (saveError || profileError || !profile) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Could not load your account. Please try again." }, { status: 503 });
    }
    if (isTemporaryLoginEnabled() && profile.role === "admin") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Temporary sign-in is not available for this account." }, { status: 403 });
    }
    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
    }
    return NextResponse.json({ success: true, isProfileComplete: Boolean(profile?.roll_number && profile?.full_name) });
  } catch (error) {
    return handleApiError(error);
  }
}
