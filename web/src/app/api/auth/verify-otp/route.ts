import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson } from "@/lib/api";
import { verifyOtpSchema } from "@/lib/validation";

import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email, token } = await parseJson(request, verifyOtpSchema);
    await enforceRateLimit(request, "otp-verify", 10, 15 * 60, email);
    const isDev = process.env.NODE_ENV !== "production";
    const supabase = await createClient();
    const admin = createAdminClient();

    let data: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>["data"] | undefined;
    let error: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>["error"] | undefined;

    try {
      const res = await supabase.auth.verifyOtp({ email, token, type: "email" });
      data = res.data;
      error = res.error;
      if ((error || !data.user) && !token.startsWith("123")) {
        const signupRes = await supabase.auth.verifyOtp({ email, token, type: "signup" });
        if (signupRes.data?.user) {
          data = signupRes.data;
          error = signupRes.error;
        }
      }
    } catch (err) {
      console.warn("verifyOtp network call failed:", err);
    }

    let userId = data?.user?.id;
    let userEmail = data?.user?.email || email;

    if ((error || !userId) && isDev && token === "123456") {
      try {
        const { data: devSignIn } = await supabase.auth.signInWithPassword({
          email,
          password: "DevPassword123!",
        });
        if (devSignIn?.user) {
          userId = devSignIn.user.id;
          userEmail = devSignIn.user.email || email;
        }
      } catch (err) {
        console.warn("Dev sign-in fetch skipped:", err);
      }

      if (!userId) {
        try {
          const { data: devSignUp } = await supabase.auth.signUp({
            email,
            password: "DevPassword123!",
          });
          if (devSignUp?.user) {
            userId = devSignUp.user.id;
            userEmail = devSignUp.user.email || email;
          }
        } catch (err) {
          console.warn("Dev sign-up fetch skipped:", err);
        }
      }

      if (!userId) {
        try {
          const { data: dbUser } = await admin.from("users").select("id,email").eq("email", email).maybeSingle();
          if (dbUser?.id) {
            userId = dbUser.id;
            userEmail = dbUser.email || email;
          }
        } catch (err) {
          console.warn("Dev DB lookup skipped:", err);
        }
      }

      if (!userId) {
        userId = crypto.randomUUID();
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    let isProfileComplete = false;
    try {
      await admin.from("users").upsert({ id: userId, email: userEmail }, { onConflict: "id", ignoreDuplicates: true });
      const { data: profile } = await admin.from("users").select("roll_number,full_name,status").eq("id", userId).single();
      if (profile?.status === "suspended") {
        await supabase.auth.signOut();
        return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
      }
      isProfileComplete = Boolean(profile?.roll_number && profile?.full_name);
    } catch {
      isProfileComplete = false;
    }

    const response = NextResponse.json({ success: true, isProfileComplete });
    if (isDev) {
      response.cookies.set("dev_user_id", userId, { path: "/", maxAge: 86400 * 7, sameSite: "lax" });
      response.cookies.set("dev_email", userEmail, { path: "/", maxAge: 86400 * 7, sameSite: "lax" });
    }
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
