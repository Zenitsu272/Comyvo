import "server-only";
import { ApiError } from "@/lib/api";
import { isAllowedEmail } from "@/lib/auth";
import { isTemporaryLoginEnabled, TEMPORARY_LOGIN_CODE } from "@/lib/login-mode";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function verifyLoginCode(email: string, token: string, client?: Awaited<ReturnType<typeof createClient>>) {
  if (!isAllowedEmail(email)) throw new ApiError(400, "Only Amrita college emails are accepted.");
  if (!isTemporaryLoginEnabled()) {
    const auth = client ?? await createClient();
    return auth.auth.verifyOtp({ email, token, type: "email" });
  }
  if (token !== TEMPORARY_LOGIN_CODE) throw new ApiError(400, "Enter the temporary code 123456.");

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from("users")
    .select("role,status").eq("email", email).maybeSingle();
  if (profileError) throw new ApiError(503, "Account checks are unavailable. Please try again.");
  if (profile?.role === "admin" || profile?.status === "suspended") {
    throw new ApiError(403, "Temporary sign-in is not available for this account.");
  }

  // Mint and redeem a real Supabase session server-side. No email is sent,
  // no invented cookies are trusted, and no privileged token reaches the client.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) throw new ApiError(502, "Could not start temporary sign-in. Please try again.");
  const auth = client ?? await createClient();
  // "email" handles both first-time signup tokens and returning-user links.
  return auth.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
}
