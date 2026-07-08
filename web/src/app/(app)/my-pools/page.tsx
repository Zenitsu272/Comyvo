"use client";

import { useState, useEffect } from "react";
import PoolCard, { Pool } from "@/components/pools/PoolCard";
import { PoolCardSkeleton } from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { formatDeparture } from "@/lib/utils";

export default function MyPoolsPage() {
  const [tab, setTab] = useState<"created" | "joined">("created");
  const [allPools, setAllPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const res = await fetch("/api/pools");
      if (!res.ok) { setLoading(false); return; }
      const data: Pool[] = await res.json();
      setAllPools(data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const created = allPools.filter((p) => p.is_host);
  const joined = allPools.filter((p) => p.is_member && !p.is_host);
  const displayed = tab === "created" ? created : joined;

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const res = await fetch(`/api/pools/${cancelTarget}`, { method: "DELETE" });
    const data = await res.json();
    setCancelling(false);
    setCancelTarget(null);
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Pool cancelled.", "info");
    setAllPools((prev) => prev.filter((p) => p.id !== cancelTarget));
  };

  const handleLeave = async (id: string) => {
    const res = await fetch(`/api/pools/${id}/leave`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Left the pool.", "info");
    setAllPools((prev) => prev.map((p) => p.id === id ? { ...p, is_member: false } : p));
  };

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Your trips</p>
          <h1>My pools</h1>
        </div>
      </header>

      <div className="screen-content">
        <div className="section-heading">
          <h2>Manage created and joined pools</h2>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === "created" ? "is-active" : ""}`} onClick={() => setTab("created")}>
            Created by me {created.length > 0 && `(${created.length})`}
          </button>
          <button className={`tab ${tab === "joined" ? "is-active" : ""}`} onClick={() => setTab("joined")}>
            Joined by me {joined.length > 0 && `(${joined.length})`}
          </button>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 12 }}>
            <PoolCardSkeleton />
            <PoolCardSkeleton />
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <h3>{tab === "created" ? "No pools created yet" : "You haven't joined any pools"}</h3>
            <p>
              {tab === "created"
                ? "Create a pool and students near you can join your ride."
                : "Browse available pools and join one to see it here."}
            </p>
            <a href={tab === "created" ? "/create" : "/discover"} className="btn-solid btn btn-sm">
              {tab === "created" ? "Create pool" : "Discover pools"}
            </a>
          </div>
        ) : (
          <div className="manage-grid">
            {displayed.map((pool) => (
              <article key={pool.id} className={`manage-card${pool.status !== "active" ? " subdued" : ""}`}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <span className={`badge ${pool.status === "active" ? "badge-success" : pool.status === "full" ? "badge-warning" : "badge-neutral"}`}>
                    {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
                  </span>
                  {pool.women_only && <span className="badge badge-rose">Women only</span>}
                </div>
                <h3>{pool.from_location} → {pool.to_location}</h3>
                <p style={{ fontSize: "0.88rem" }}>
                  {pool.total_seats - pool.available_seats} joined · {pool.available_seats} seat{pool.available_seats !== 1 ? "s" : ""} left · {formatDeparture(pool.departure_at)}
                </p>

                {pool.is_member && !pool.is_host && (
                  <div className="contact-box" style={{ marginBottom: 12 }}>
                    <span>Host phone</span>
                    <strong>{pool.host_phone_full ?? pool.host_phone_masked}</strong>
                  </div>
                )}

                <div className="card-actions" style={{ marginTop: 12 }}>
                  {pool.is_host ? (
                    <>
                      <a href={`/pool/${pool.id}`} className="btn-ghost btn btn-sm">Members</a>
                      <a href={`/pool/${pool.id}/edit`} className="btn-ghost btn btn-sm" style={{ border: "1.5px solid var(--teal)", color: "var(--teal)" }}>Edit</a>
                      <button className="btn-danger btn btn-sm" onClick={() => setCancelTarget(pool.id)}>
                        Cancel pool
                      </button>
                    </>
                  ) : (
                    <>
                      <a href={`/pool/${pool.id}`} className="btn-ghost btn btn-sm">View</a>
                      <button className="btn-danger btn btn-sm" onClick={() => handleLeave(pool.id)}>
                        Leave pool
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {cancelTarget && (
        <Modal
          title="Cancel this pool?"
          message="All members will lose their seats. This action cannot be undone."
          confirmLabel="Cancel Pool"
          variant="danger"
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}
    </>
  );
}
