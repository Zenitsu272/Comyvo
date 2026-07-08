"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDomainError } from "@/lib/auth";
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
    toast("OTP sent! Check your college email.", "success");
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

    if (!res.ok) { toast(data.error, "error"); return; }

    if (!data.isProfileComplete) {
      router.push("/signup");
    } else {
      router.push(next);
    }
  };

  return (
    <div className="auth-shell">
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <Link href="/" className="brand" style={{ display: "inline-flex", justifyContent: "center" }}>
          <span className="brand-mark">C</span>
          <span style={{ textAlign: "left" }}>
            <strong>Commuto</strong>
            <small>Campus carpool</small>
          </span>
        </Link>
      </div>

      <div className="auth-card">
        {step === "email" ? (
          <>
            <p className="kicker">Step 1 of 2</p>
            <h2>Verify college email</h2>
            <p className="helper">Only Amrita email addresses are accepted.</p>
            <hr className="auth-divider" />
            <form onSubmit={handleSendOtp} style={{ display: "grid", gap: 14 }}>
              <label>
                <span>Amrita email</span>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  placeholder="student@cb.amrita.edu"
                  required
                  autoFocus
                />
                {emailError && <span style={{ color: "var(--red)", fontSize: "0.82rem", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>{emailError}</span>}
              </label>
              <p className="helper success-text">✓ Allowed: amrita.edu, cb.amrita.edu, ch.amrita.edu</p>
              <button type="submit" className="btn-solid btn btn-wide" disabled={loading}>
                {loading ? "Sending…" : "Send OTP →"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="kicker">Step 1 of 2</p>
            <h2>Enter your OTP</h2>
            <p className="helper">We sent a 6-digit code to <strong>{email}</strong></p>
            <hr className="auth-divider" />
            <form onSubmit={handleVerifyOtp} style={{ display: "grid", gap: 14 }}>
              <label>
                <span>One-time code</span>
                <input
                  id="otp-input"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  required
                  style={{ fontSize: "1.5rem", letterSpacing: "0.2em", textAlign: "center" }}
                />
              </label>
              <button type="submit" className="btn-solid btn btn-wide" disabled={loading || otp.length < 6}>
                {loading ? "Verifying…" : "Verify →"}
              </button>
              <button type="button" className="btn-ghost btn btn-wide" onClick={() => { setStep("email"); setOtp(""); }}>
                ← Change email
              </button>
            </form>
          </>
        )}
      </div>

      <p style={{ marginTop: 20, color: "var(--muted)", fontSize: "0.84rem", textAlign: "center" }}>
        By signing in you agree to use Commuto responsibly within campus policy.
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
