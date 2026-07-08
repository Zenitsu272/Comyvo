"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/Toast";
import ToastContainer from "@/components/ui/Toast";

const DEPARTMENTS = ["CCE", "CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "AIDS", "Other"];
const CAMPUSES = ["Coimbatore", "Chennai", "Bengaluru", "Kochi", "Mysuru", "Amritapuri"];

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    roll_number: "",
    phone: "",
    department: "CCE",
    gender: "",
    campus: "Coimbatore",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
    toast("Profile saved! Welcome to Commuto.", "success");
    setTimeout(() => router.push("/discover"), 600);
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

      <div className="auth-card" style={{ maxWidth: 520 }}>
        <p className="kicker">Step 2 of 2</p>
        <h2>Complete your profile</h2>
        <p className="helper">This info helps hosts and co-riders know who you are.</p>
        <hr className="auth-divider" />

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div className="field-grid">
            <label>
              <span>Full name *</span>
              <input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Vaishak N" required />
            </label>
            <label>
              <span>Roll number *</span>
              <input id="roll_number" name="roll_number" value={form.roll_number} onChange={handleChange} placeholder="CB.EN.U4CCE24XXX" required />
            </label>
            <label>
              <span>Phone</span>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="9876543210" type="tel" />
            </label>
            <label>
              <span>Department</span>
              <select id="department" name="department" value={form.department} onChange={handleChange}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
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
            <label>
              <span>Campus</span>
              <select id="campus" name="campus" value={form.campus} onChange={handleChange}>
                {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <p className="helper">Skipping phone keeps your number unverified. You can add it later in settings.</p>

          <button type="submit" className="btn-solid btn btn-wide" disabled={loading}>
            {loading ? "Saving…" : "Complete profile →"}
          </button>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}
