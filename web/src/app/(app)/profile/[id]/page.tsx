"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShieldCheck, AlertTriangle, Car, Calendar, Award, Mail } from "lucide-react";
import { DecodedStudent } from "@/lib/auth";

interface UserProfile {
  id: string;
  full_name: string | null;
  roll_number: string | null;
  department: string | null;
  campus: string | null;
  gender: string | null;
  year_of_joining: number | null;
  role: "student" | "premium" | "admin";
  is_phone_verified: boolean;
  email: string;
  decoded: DecodedStudent;
  stats: {
    hosted: number;
    joined: number;
  };
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        toast("Profile not found.", "error");
        router.push("/discover");
        return;
      }
      const data = await res.json();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [id, router]);

  if (loading) {
    return (
      <>
        <header className="topbar"><div className="title-block"><Skeleton height={32} width={180} /></div></header>
        <div className="screen-content">
          <div style={{ display: "grid", gap: 14 }}>
            <Skeleton height={180} />
            <Skeleton height={240} />
          </div>
        </div>
      </>
    );
  }

  if (!profile) return null;

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Student profile</p>
          <h1>{profile.full_name ?? "Amrita Student"}</h1>
        </div>
        <div className="top-actions">
          <button className="btn-ghost btn btn-sm" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </header>

      <div className="screen-content" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Header Card */}
          <div style={{
            background: "var(--panel)",
            border: "1.5px solid var(--line)",
            borderRadius: 18,
            padding: 32,
            display: "flex",
            alignItems: "center",
            gap: 24,
            boxShadow: "var(--shadow-sm)",
            flexWrap: "wrap"
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--teal-weak)",
              color: "var(--teal)",
              display: "grid",
              placeItems: "center",
              fontSize: "1.8rem",
              fontWeight: 800
            }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.6rem", margin: 0 }}>{profile.full_name || "—"}</h2>
                <span className={`badge ${profile.role === "admin" ? "badge-neutral" : profile.role === "premium" ? "badge-premium" : "badge-success"}`}>
                  {profile.role.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
                {profile.roll_number ?? "No roll number added"}
              </p>
              <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
                <span className="trust-verified trust" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={14} />
                  Amrita Student Whitelisted
                </span>
                {profile.is_phone_verified ? (
                  <span className="trust-verified trust" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={14} />
                    Phone Verified
                  </span>
                ) : (
                  <span className="trust-caution trust" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} />
                    Phone Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="metric-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ padding: 12, background: "var(--teal-weak)", borderRadius: 12, color: "var(--teal)" }}>
                <Car size={24} />
              </div>
              <div>
                <span>Rides Hosted</span>
                <strong style={{ fontSize: "1.8rem", marginTop: 2 }}>{profile.stats.hosted}</strong>
              </div>
            </div>

            <div className="metric-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ padding: 12, background: "#ebeafd", borderRadius: 12, color: "var(--blue)" }}>
                <Calendar size={24} />
              </div>
              <div>
                <span>Rides Joined</span>
                <strong style={{ fontSize: "1.8rem", marginTop: 2 }}>{profile.stats.joined}</strong>
              </div>
            </div>
          </div>

          {/* Derived / Decoded Profile Grid */}
          <div style={{
            background: "var(--panel)",
            border: "1.5px solid var(--line)",
            borderRadius: 18,
            padding: 32,
            boxShadow: "var(--shadow-sm)"
          }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: 20 }}>Verified student details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ padding: 14, border: "1.5px solid var(--line)", borderRadius: 12, background: "var(--panel-soft)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Campus</span>
                <strong style={{ fontSize: "0.95rem" }}>{profile.campus ?? "Coimbatore"}</strong>
              </div>
              <div style={{ padding: 14, border: "1.5px solid var(--line)", borderRadius: 12, background: "var(--panel-soft)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Department</span>
                <strong style={{ fontSize: "0.95rem" }}>{profile.decoded.department ?? profile.department ?? "—"}</strong>
              </div>
              <div style={{ padding: 14, border: "1.5px solid var(--line)", borderRadius: 12, background: "var(--panel-soft)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Program</span>
                <strong style={{ fontSize: "0.95rem" }}>{profile.decoded.program ?? "Undergraduate"}</strong>
              </div>
              <div style={{ padding: 14, border: "1.5px solid var(--line)", borderRadius: 12, background: "var(--panel-soft)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Batch / Year of Joining</span>
                <strong style={{ fontSize: "0.95rem" }}>{profile.decoded.batchLabel ?? `${profile.year_of_joining}`}</strong>
              </div>
              <div style={{ padding: 14, border: "1.5px solid var(--line)", borderRadius: 12, background: "var(--panel-soft)", gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Course Portal</span>
                <strong style={{ fontSize: "0.95rem" }}>{profile.decoded.course ?? "Engineering"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
