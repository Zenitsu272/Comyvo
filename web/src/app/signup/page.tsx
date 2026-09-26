"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/Toast";
import ToastContainer from "@/components/ui/Toast";
import { getSafeNextPath } from "@/lib/auth";

const DEPARTMENTS = [
  "CCE", "CSE", "ECE", "EEE", "MECH", "CIVIL", "IT",
  "AIDS", "AI", "IOT", "ROB", "CSB", "CSN", "CSD", "CSS", "Other",
];
const CAMPUSES = ["Coimbatore", "Chennai", "Bengaluru", "Kochi", "Mysuru", "Amritapuri"];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));
  const [loading, setLoading] = useState(false);

  // Pre-fill from decoded email params
  const prefillRoll = searchParams.get("roll") ?? "";
  const prefillCampus = searchParams.get("campus") ?? "Coimbatore";
  const prefillDept = searchParams.get("dept") ?? "CCE";
  const prefillYear = searchParams.get("year") ?? "";

  const [form, setForm] = useState({
    full_name: "",
    roll_number: prefillRoll,
    phone: "",
    department: prefillDept,
    gender: "",
    campus: prefillCampus,
    year_of_joining: prefillYear,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.roll_number) {
      toast("Name and roll number are required.", "error");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Welcome to Comyvo!", "success");
    setTimeout(() => router.push(next), 700);
  };

  const prefilled = !!(prefillRoll || prefillDept || prefillCampus);

  return (
    <div className="auth-shell">
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <Link href="/" className="brand" style={{ display: "inline-flex", justifyContent: "center", gap: 12 }}>
          <span className="brand-mark" style={{ width: 40, height: 40, fontSize: "1rem" }}>C</span>
          <span style={{ textAlign: "left" }}>
            <strong style={{ display: "block" }}>Comyvo</strong>
            <small style={{ display: "block", color: "var(--muted)", fontSize: "0.76rem" }}>Campus carpool</small>
          </span>
        </Link>
      </div>

      <div className="auth-card" style={{ maxWidth: 540 }}>
        <p className="kicker">Step 2 of 2</p>
        <h2>Complete your profile</h2>

        {prefilled ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "var(--teal-weak)", marginBottom: 14, border: "1px solid rgba(11,143,111,0.18)" }}>
            <span style={{ fontSize: "1.1rem" }}>✨</span>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--teal)", fontWeight: 600 }}>
              Some fields were auto-filled from your college email. Just add your name and phone!
            </p>
          </div>
        ) : (
          <p className="helper" style={{ marginBottom: 14 }}>
            This helps hosts and co-riders know who you are.
          </p>
        )}

        <hr className="divider" />

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div className="field-grid">
            <label>
              <span>Full name *</span>
              <input
                id="full_name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Vaishak N"
                required
                autoFocus
              />
            </label>
            <label>
              <span>
                Roll number *
                {prefillRoll && <span style={{ color: "var(--teal)", marginLeft: 4 }}>↑ auto-filled</span>}
              </span>
              <input
                id="roll_number"
                name="roll_number"
                value={form.roll_number}
                onChange={handleChange}
                placeholder="CB.EN.U4CCE24130"
                required
                style={prefillRoll ? { borderColor: "rgba(11,143,111,0.4)", background: "#f8fefb" } : {}}
              />
            </label>
            <label>
              <span>Phone number</span>
              <input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="9876543210"
                type="tel"
                maxLength={10}
              />
            </label>
            <label>
              <span>
                Department
                {prefillDept && <span style={{ color: "var(--teal)", marginLeft: 4 }}>↑ auto-filled</span>}
              </span>
              <select
                id="department"
                name="department"
                value={form.department}
                onChange={handleChange}
                style={prefillDept ? { borderColor: "rgba(11,143,111,0.4)", background: "#f8fefb" } : {}}
              >
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label>
              <span>Year of joining
                {prefillYear && <span style={{ color: "var(--teal)", marginLeft: 4 }}>↑ auto-filled</span>}
              </span>
              <input
                id="year_of_joining"
                name="year_of_joining"
                value={form.year_of_joining}
                onChange={handleChange}
                placeholder="2024"
                type="number"
                min="2000"
                max="2099"
                style={prefillYear ? { borderColor: "rgba(11,143,111,0.4)", background: "#f8fefb" } : {}}
              />
            </label>
            <label>
              <span>Gender</span>
              <select id="gender" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span>
                Campus
                {prefillCampus !== "Coimbatore" && prefillCampus && <span style={{ color: "var(--teal)", marginLeft: 4 }}>↑ auto-filled</span>}
              </span>
              <select
                id="campus"
                name="campus"
                value={form.campus}
                onChange={handleChange}
                style={prefillCampus ? { borderColor: "rgba(11,143,111,0.4)", background: "#f8fefb" } : {}}
              >
                {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <p className="helper">
            Skipping phone keeps your number unverified on pools. You can verify it later from your profile.
          </p>

          <button type="submit" className="btn-solid btn btn-wide btn-lg" disabled={loading}>
            {loading ? "Saving…" : "Complete profile & enter Comyvo →"}
          </button>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
