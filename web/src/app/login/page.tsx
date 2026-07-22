"use client";

import { useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDomainError, decodeAmritaEmail } from "@/lib/auth";
import { toast } from "@/components/ui/Toast";
import ToastContainer from "@/components/ui/Toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/discover";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Still decode silently for pre-filling signup — just don't show the card
  const decoded = useMemo(() => decodeAmritaEmail(email), [email]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = getDomainError(email);
    if (err) { setEmailError(err); return; }
    setEmailError(null);
    setLoading(true);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setEmailError(data.error); return; }
    setStep("otp");
    toast("OTP sent! Check your college email inbox.", "success");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token: otp }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { toast(data.error ?? "Invalid or expired code.", "error"); return; }

    if (!data.isProfileComplete) {
      // Pass decoded info to signup for pre-filling
      const params = new URLSearchParams();
      if (decoded.fullRollNumber) params.set("roll", decoded.fullRollNumber);
      if (decoded.campus)         params.set("campus", decoded.campus);
      if (decoded.departmentCode) params.set("dept", decoded.departmentCode);
      if (decoded.yearOfJoining)  params.set("year", String(decoded.yearOfJoining));
      router.push(`/signup?${params.toString()}`);
    } else {
      router.push(next);
    }
  };

  return (
    <div className="auth-shell">
      {/* Brand */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <span className="brand-mark" style={{ width: 44, height: 44, fontSize: "1.1rem" }}>C</span>
          <span style={{ textAlign: "left" }}>
            <strong style={{ display: "block", fontSize: "1.1rem" }}>Comyvo</strong>
            <small style={{ display: "block", color: "var(--muted)", fontSize: "0.76rem" }}>Campus carpool</small>
          </span>
        </Link>
      </div>

      <div className="auth-card">
        {step === "email" ? (
          <>
            <p className="kicker">Sign in</p>
            <h2>Enter your college email</h2>
            <p className="helper">We&apos;ll send a one-time code to verify it&apos;s you.</p>
            <hr className="divider" />

            <form onSubmit={handleSendOtp} style={{ display: "grid", gap: 14 }}>
              <label>
                <span>Amrita email</span>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  placeholder="cb.en.u4cce24130@cb.students.amrita.edu"
                  required
                  autoFocus
                  autoComplete="email"
                />
                {emailError && (
                  <span className="error-text" style={{ textTransform: "none", letterSpacing: 0 }}>
                    {emailError}
                  </span>
                )}
              </label>

              <p className="helper" style={{ fontSize: "0.78rem" }}>
                <span style={{ color: "var(--teal)", fontWeight: 700 }}>Only Amrita emails accepted — </span>
                e.g. cb.en.u4cce24130@cb.students.amrita.edu
              </p>

              <button
                type="submit"
                className="btn-solid btn btn-wide btn-lg"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send OTP →"}
              </button>

            </form>
          </>
        ) : (
          <>
            <p className="kicker">One more step</p>
            <h2>Check your email</h2>
            <p className="helper">
              We sent a 6-digit code to{" "}
              <strong style={{ color: "var(--ink)", fontFamily: "monospace", fontSize: "0.9rem" }}>{email}</strong>
            </p>
            <hr className="divider" />

            <form onSubmit={handleVerifyOtp} style={{ display: "grid", gap: 14 }}>
              <label>
                <span>6-digit code</span>
                <input
                  id="otp-input"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  style={{ fontSize: "2rem", letterSpacing: "0.35em", textAlign: "center", fontWeight: 800 }}
                />
              </label>
              <button
                type="submit"
                className="btn-solid btn btn-wide btn-lg"
                disabled={loading || otp.length < 6}
              >
                {loading ? "Verifying…" : "Verify & Sign in →"}
              </button>
              <button
                type="button"
                className="btn-ghost btn btn-wide btn-sm"
                onClick={() => { setStep("email"); setOtp(""); }}
              >
                ← Change email
              </button>
            </form>
          </>
        )}
      </div>

      <p style={{ marginTop: 18, color: "var(--muted)", fontSize: "0.8rem", textAlign: "center", maxWidth: 380 }}>
        By signing in you agree to use Comyvo responsibly within campus policy.
      </p>
      <ToastContainer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
