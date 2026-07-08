"use client";

import { useState, useEffect } from "react";
import { Pool } from "@/components/pools/PoolCard";
import PoolCard from "@/components/pools/PoolCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { formatDeparture } from "@/lib/utils";
import { use } from "react";

interface Member {
  user_id: string;
  users: { roll_number: string | null; full_name: string | null } | null;
}

interface PoolDetail extends Pool {
  members: Member[];
  host_phone_full: string | null;
  campus: string | null;
}

export default function PoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchPool = async () => {
      const res = await fetch(`/api/pools/${id}`);
      if (!res.ok) { setLoading(false); return; }
      setPool(await res.json());
      setLoading(false);
    };
    fetchPool();
  }, [id]);

  const handleJoin = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/pools/${id}/join`, { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Joined the pool!", "success");
    setPool((p) => p ? { ...p, is_member: true, available_seats: p.available_seats - 1 } : p);
  };

  const handleLeave = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/pools/${id}/leave`, { method: "DELETE" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Left the pool.", "info");
    setPool((p) => p ? { ...p, is_member: false, available_seats: p.available_seats + 1 } : p);
  };

  if (loading) {
    return (
      <>
        <header className="topbar"><div className="title-block"><Skeleton height={32} width={220} /></div></header>
        <div className="screen-content">
          <Skeleton height={200} />
          <div style={{ marginTop: 20 }}>
            <Skeleton height={20} width="60%" />
            <div style={{ marginTop: 12 }}><Skeleton height={20} width="40%" /></div>
          </div>
        </div>
      </>
    );
  }

  if (!pool) {
    return (
      <>
        <header className="topbar"><div className="title-block"><h1>Pool not found</h1></div></header>
        <div className="screen-content">
          <div className="empty-state">
            <h3>This pool doesn&apos;t exist</h3>
            <p>It may have been cancelled or you may not have access.</p>
            <a href="/discover" className="btn-solid btn btn-sm">Back to Discover</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Pool details</p>
          <h1>{pool.from_location} → {pool.to_location}</h1>
        </div>
        <div className="top-actions">
          <a href="/discover" className="btn-ghost btn btn-sm">← Back</a>
        </div>
      </header>

      <div className="screen-content">
        <div className="pool-detail-layout">
          <div className="pool-detail-card">
            {/* Badges */}
            <div className="ride-status" style={{ marginBottom: 20 }}>
              <span className={`badge ${pool.available_seats === 0 ? "badge-danger" : "badge-success"}`}>
                {pool.available_seats === 0 ? "Full" : `${pool.available_seats} seat${pool.available_seats !== 1 ? "s" : ""} left`}
              </span>
              {pool.women_only && <span className="badge badge-rose">Women only</span>}
              {pool.is_host && <span className="badge badge-neutral">Your pool</span>}
              {pool.is_member && <span className="badge badge-success">Joined</span>}
            </div>

            {/* Route */}
            <div className="route">
              <div>
                <span className="route-dot" />
                <p>{pool.from_location}</p>
                <small>{formatDeparture(pool.departure_at)}</small>
              </div>
              <div>
                <span className="route-dot end" />
                <p>{pool.to_location}</p>
                <small>Destination</small>
              </div>
            </div>

            {/* Meta */}
            <div className="ride-meta">
              <div>
                <span>Host</span>
                <strong>{pool.host_roll ?? pool.host_name ?? "—"}</strong>
              </div>
              <div>
                <span>Cost</span>
                <strong>₹{pool.cost_per_person}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{pool.host_phone_full ?? pool.host_phone_masked}</strong>
              </div>
            </div>

            {pool.notes && (
              <div style={{ padding: 14, borderRadius: 10, background: "var(--panel-soft)", marginBottom: 14 }}>
                <span style={{ display: "block", color: "var(--muted)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Host notes</span>
                <p style={{ margin: 0, lineHeight: 1.5, fontSize: "0.92rem" }}>{pool.notes}</p>
              </div>
            )}

            {/* Actions */}
            {!pool.is_host && (
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {pool.is_member ? (
                  <button className="btn-danger btn" onClick={handleLeave} disabled={actionLoading}>
                    {actionLoading ? "Leaving…" : "Leave pool"}
                  </button>
                ) : (
                  <button className="btn-solid btn" onClick={handleJoin} disabled={actionLoading || pool.available_seats === 0}>
                    {actionLoading ? "Joining…" : pool.available_seats === 0 ? "Full" : "Join pool"}
                  </button>
                )}
                <button className="btn-ghost btn" onClick={() => toast("Report submitted. Admins will review it.", "info")}>
                  Report
                </button>
              </div>
            )}
          </div>

          {/* Aside */}
          <div className="pool-detail-aside">
            {/* Members */}
            <div style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
              <h3>Members ({pool.members.length}/{pool.total_seats})</h3>
              {pool.members.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No members yet.</p>
              ) : (
                <div className="member-strip" style={{ flexWrap: "wrap", gap: 8 }}>
                  {pool.members.map((m) => (
                    <div key={m.user_id} title={m.users?.full_name ?? ""}>
                      <span className="member-avatar">
                        {(m.users?.full_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pool info */}
            <div style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
              <h3>Pool info</h3>
              <div className="insight-list">
                <div><span>Campus</span><strong>{pool.campus ?? "Coimbatore"}</strong></div>
                <div><span>Total seats</span><strong>{pool.total_seats}</strong></div>
                <div><span>Status</span><strong>{pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}</strong></div>
                <div>
                  <span>Phone visibility</span>
                  <strong style={{ fontSize: "0.82rem" }}>
                    {pool.contact_visibility === "always" ? "Everyone"
                      : pool.contact_visibility === "premium_only" ? "Premium only"
                      : "After joining"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
