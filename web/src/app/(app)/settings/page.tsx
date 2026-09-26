"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
import { ShieldCheck, AlertTriangle, Crown, LogOut, Trash2 } from "lucide-react";

const DEPARTMENTS = [
  "CCE", "CSE", "ECE", "EEE", "MECH", "CIVIL", "IT",
  "AIDS", "AI", "IOT", "ROB", "CSB", "CSN", "CSD", "CSS", "Other",
];
const CAMPUSES = ["Coimbatore", "Chennai", "Bengaluru", "Kochi", "Mysuru", "Amritapuri"];

interface Profile {
  full_name: string | null;
  roll_number: string | null;
  phone: string | null;
  is_phone_verified: boolean;
  department: string | null;
  campus: string | null;
  gender: string | null;
  year_of_joining: number | null;
  email: string;
  role: "student" | "premium" | "admin";
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      setProfile(response.ok ? await response.json() : null);
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: name === "year_of_joining" ? (value ? Number(value) : null) : value,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    const res = await fetch("/api/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast(data.error ?? "Failed to save profile", "error");
      return;
    }
    toast("Profile updated successfully!", "success");
  };

  const handleRequestPhoneOtp = async () => {
    if (!profile?.phone) return;
    setVerifyingPhone(true);
    const response = await fetch("/api/phone/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: profile.phone }),
    });
    const data = await response.json();
    setVerifyingPhone(false);
    if (!response.ok) return toast(data.error || "Verification code could not be sent.", "error");
    setShowPhoneVerifyModal(true);
    if (data.development_code) {
      setPhoneOtp(data.development_code);
      toast(`Local verification code: ${data.development_code}`, "info");
    } else {
      toast("Verification code sent by SMS.", "success");
    }
  };

  const handleVerifyPhone = async () => {
    if (!profile?.phone) return;
    setVerifyingPhone(true);
    const response = await fetch("/api/phone/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: profile.phone, code: phoneOtp }),
    });
    const data = await response.json();
    setVerifyingPhone(false);
    if (!response.ok) return toast(data.error || "Verification failed.", "error");
    setShowPhoneVerifyModal(false);
    toast("Phone number verified successfully!", "success");
    setProfile((prev) => prev ? { ...prev, is_phone_verified: true } : null);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleRequestPremium = async () => {
    router.push("/premium");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    setDeleting(true);
    const response = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteConfirmation }),
    });
    const data = await response.json();
    setDeleting(false);
    if (!response.ok) return toast(data.error || "Account deletion failed.", "error");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading) {
    return (
      <>
        <header className="topbar"><div className="title-block"><Skeleton height={32} width={180} /></div></header>
        <div className="screen-content"><div style={{ display: "grid", gap: 14 }}><Skeleton height={200} /><Skeleton height={200} /></div></div>
      </>
    );
  }

  if (!profile) return null;

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">User profile</p>
          <h1>Profile settings</h1>
        </div>
        <div className="top-actions">
          <button className="btn-ghost btn btn-sm" onClick={handleSignOut} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      <div className="screen-content">
        <div className="create-layout">
          <form className="form-card" onSubmit={handleSave} aria-label="Profile settings">
            <div className="section-heading">
              <p className="kicker">Amrita student details</p>
              <h2>Manage account details</h2>
            </div>

            <div className="field-grid">
              <label>
                <span>Full name</span>
                <input name="full_name" value={profile.full_name ?? ""} onChange={handleChange} required />
              </label>
              <label>
                <span>Roll number</span>
                <input name="roll_number" value={profile.roll_number ?? ""} onChange={handleChange} required />
              </label>
              <label>
                <span>Email (read-only)</span>
                <input value={profile.email} disabled style={{ background: "var(--panel-soft)", color: "var(--muted)", cursor: "not-allowed" }} />
              </label>
              <label>
                <span>Phone number</span>
                <input name="phone" value={profile.phone ?? ""} onChange={handleChange} type="tel" maxLength={10} placeholder="e.g. 9876543210" />
              </label>
              <label>
                <span>Department</span>
                <select name="department" value={profile.department ?? "CCE"} onChange={handleChange}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label>
                <span>Year of joining</span>
                <input name="year_of_joining" value={profile.year_of_joining ?? ""} onChange={handleChange} type="number" placeholder="e.g. 2024" />
              </label>
              <label>
                <span>Gender</span>
                <select name="gender" value={profile.gender ?? ""} onChange={handleChange}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span>Campus</span>
                <select name="campus" value={profile.campus ?? "Coimbatore"} onChange={handleChange}>
                  {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <button type="submit" className="btn-solid btn btn-wide" disabled={saving}>
              {saving ? "Saving changes…" : "Save Profile Details"}
            </button>
          </form>

          {/* Sidebar Cards */}
          <aside className="phone-preview" aria-label="Account status" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Phone Verification Status */}
            <div style={{ padding: 24, border: "1.5px solid var(--line)", borderRadius: 18, background: "#fff" }}>
              <p className="kicker">Trust & safety</p>
              <h3 style={{ fontSize: "1.1rem", margin: "6px 0 10px" }}>Phone status</h3>
              {profile.phone ? (
                profile.is_phone_verified ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span className="trust trust-verified" style={{ alignSelf: "flex-start", gap: 6, display: "inline-flex", alignItems: "center" }}>
                      <ShieldCheck size={14} />
                      Verified number
                    </span>
                    <p className="helper" style={{ fontSize: "0.82rem" }}>Other students will see the verified badge on your rides.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span className="trust trust-caution" style={{ alignSelf: "flex-start", gap: 6, display: "inline-flex", alignItems: "center" }}>
                      <AlertTriangle size={14} />
                      Unverified number
                    </span>
                    <p className="helper" style={{ fontSize: "0.82rem" }}>Verify your phone number to build trust in the campus community.</p>
                    <button type="button" className="btn-teal btn btn-sm" onClick={handleRequestPhoneOtp} disabled={verifyingPhone}>
                      {verifyingPhone ? "Sending…" : "Verify Now"}
                    </button>
                  </div>
                )
              ) : (
                <p className="helper" style={{ fontSize: "0.82rem" }}>Add your phone number to get verified.</p>
              )}
            </div>

            {/* Account Tier */}
            <div style={{ padding: 24, border: "1.5px solid var(--line)", borderRadius: 18, background: "#fff" }}>
              <p className="kicker">Account level</p>
              <h3 style={{ fontSize: "1.1rem", margin: "6px 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                Tier:{" "}
                <span className={`badge ${profile.role === "admin" ? "badge-neutral" : profile.role === "premium" ? "badge-premium" : "badge-success"}`}>
                  {profile.role.toUpperCase()}
                </span>
              </h3>
              {profile.role === "student" && (
                <>
                  <p className="helper" style={{ fontSize: "0.82rem", marginBottom: 14 }}>
                    Upgrade to Premium to view host contact details immediately without joining.
                  </p>
                  <button type="button" className="btn-ghost btn btn-sm btn-wide" onClick={handleRequestPremium}>
                    Upgrade to Premium
                  </button>
                </>
              )}
              {profile.role === "premium" && (
                <p className="helper" style={{ fontSize: "0.82rem", display: "flex", gap: 6, alignItems: "center" }}>
                  <Crown size={14} style={{ color: "var(--amber)" }} />
                  Active premium perks unlocked.
                </p>
              )}
              {profile.role === "admin" && (
                <p className="helper" style={{ fontSize: "0.82rem" }}>
                  You have full moderation rights over campus rides and reports.
                </p>
              )}
            </div>

            <div style={{ padding: 24, border: "1.5px solid rgba(190, 40, 40, 0.25)", borderRadius: 18, background: "#fff" }}>
              <p className="kicker" style={{ color: "var(--red)" }}>Danger zone</p>
              <h3 style={{ fontSize: "1.1rem", margin: "6px 0 10px" }}>Delete account</h3>
              <p className="helper" style={{ fontSize: "0.82rem", marginBottom: 14 }}>
                Permanently removes your profile, memberships, comments, and hosted pools.
              </p>
              <button type="button" className="btn-danger btn btn-sm btn-wide" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={14} /> Delete my account
              </button>
            </div>
          </aside>
        </div>
      </div>

      {showPhoneVerifyModal && (
        <Modal
          title="Verify your phone number"
          message="Enter the verification code sent to your saved phone number."
          confirmLabel="Verify Code"
          onConfirm={handleVerifyPhone}
          onCancel={() => setShowPhoneVerifyModal(false)}
          loading={verifyingPhone}
        >
          <div style={{ margin: "14px 0" }}>
            <input
              type="text"
              placeholder="Enter OTP"
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              style={{ fontSize: "1.6rem", letterSpacing: "0.2em", textAlign: "center", fontWeight: 800 }}
            />
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          title="Permanently delete your account?"
          message="This cannot be undone. Type DELETE to confirm. Any pools you host will be cancelled."
          confirmLabel="Delete Account"
          variant="danger"
          onConfirm={handleDeleteAccount}
          onCancel={() => { setShowDeleteModal(false); setDeleteConfirmation(""); }}
          loading={deleting}
          confirmDisabled={deleteConfirmation !== "DELETE"}
        >
          <div style={{ margin: "14px 0" }}>
            <input
              aria-label="Type DELETE to confirm"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value.toUpperCase())}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
