"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { formatDeparture, timeUntil, isDepartingSoon, cn } from "@/lib/utils";
import { formatPoolPrice } from "@/lib/pricing";

export interface Pool {
  id: string;
  from_location: string;
  to_location: string;
  departure_at: string;
  total_seats: number;
  available_seats: number;
  cost_per_person: number | null;
  pricing_mode: "fixed" | "split_equally";
  notes: string | null;
  via_route?: string | null;
  luggage_capacity?: string;
  car_type?: string;
  women_only: boolean;
  contact_visibility: "always" | "premium_only" | "after_join";
  status: "active" | "full" | "cancelled" | "completed";
  host_name: string | null;
  host_roll: string | null;
  host_phone_masked: string;
  host_phone_verified: boolean;
  host_id: string;
  is_member?: boolean;
  is_host?: boolean;
  viewer_role?: "student" | "premium" | "admin";
  host_phone_full?: string | null;
}

interface PoolCardProps {
  pool: Pool;
  onLeave?: (id: string) => Promise<void>;
}

export default function PoolCard({ pool, onLeave }: PoolCardProps) {
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"leave" | null>(null);
  const soon = isDepartingSoon(pool.departure_at);

  // Determine phone visibility
  const phoneDisplay = (() => {
    if (pool.contact_visibility === "always" || pool.viewer_role === "admin") {
      return pool.host_phone_full ?? pool.host_phone_masked;
    }
    if (pool.contact_visibility === "premium_only" && pool.viewer_role === "premium") {
      return pool.host_phone_full ?? pool.host_phone_masked;
    }
    if (pool.is_member || pool.is_host) {
      return pool.host_phone_full ?? pool.host_phone_masked;
    }
    return pool.host_phone_masked;
  })();

  const handleLeaveAction = async () => {
    setLoading(true);
    setModal(null);
    try {
      await onLeave?.(pool.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <article className={cn("ride-card", soon && "is-featured is-soon")}>
        {/* Badges */}
        <div className="ride-status">
          {soon && (
            <span className="badge badge-urgent">
              Leaving in {timeUntil(pool.departure_at)}
            </span>
          )}
          <span className={cn("badge", pool.available_seats === 0 ? "badge-danger" : pool.available_seats === 1 ? "badge-warning" : "badge-success")}>
            {pool.available_seats === 0 ? "Full" : `${pool.available_seats} seat${pool.available_seats !== 1 ? "s" : ""} left`}
          </span>
          {pool.women_only && <span className="badge badge-rose">Women only</span>}
          {pool.contact_visibility === "always" && (
            <span className="badge badge-info">Contact visible</span>
          )}
          {pool.contact_visibility === "premium_only" && (
            <span className="badge badge-info">Premium contact visible</span>
          )}
          {pool.contact_visibility === "after_join" && (
            <span className="badge badge-neutral">Contact after join</span>
          )}
          {pool.luggage_capacity === "backpacks" && (
            <span className="badge badge-neutral">🎒 Backpacks only</span>
          )}
          {pool.luggage_capacity === "trolleys" && (
            <span className="badge badge-neutral">🧳 Luggage allowed</span>
          )}
          {pool.car_type === "auto" && (
            <span className="badge badge-info" style={{ background: "var(--teal-weak)", color: "var(--teal)", borderColor: "var(--teal)" }}>
              🛺 Auto Share
            </span>
          )}
          {pool.car_type === "auto" &&
           ((pool.from_location?.toLowerCase().includes("ettimadai") && pool.to_location?.toLowerCase().includes("campus")) ||
            (pool.from_location?.toLowerCase().includes("campus") && pool.to_location?.toLowerCase().includes("ettimadai"))) && (
            <span className="badge badge-rose" style={{ background: "rgba(244, 63, 94, 0.1)", color: "#e11d48", borderColor: "#f43f5e" }}>
              📍 Ettimadai Shuttle
            </span>
          )}
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
            <small>Travel time depends on traffic</small>
          </div>
        </div>

        {pool.via_route && (
          <div style={{ marginTop: "-6px", marginBottom: "12px", paddingLeft: "16px", display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
              via {pool.via_route}
            </span>
          </div>
        )}

        {/* Meta */}
        <div className="ride-meta">
          <div>
            <span>Host</span>
            <Link href={`/profile/${pool.host_id}`} className="hover-teal" style={{ display: "block", color: "inherit", fontWeight: 700 }}>
              {pool.host_roll ?? pool.host_name ?? "—"}
            </Link>
          </div>
          <div>
            <span>Cost</span>
            <strong>{formatPoolPrice(pool)}</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{phoneDisplay}</strong>
          </div>
        </div>

        {/* Footer */}
        <div className="ride-footer">
          {pool.host_phone_verified ? (
            <span className="trust trust-verified">Phone verified</span>
          ) : (
            <span className="trust trust-caution">Unverified number</span>
          )}
          {soon && (
            <span className="trust trust-verified" style={{ marginLeft: 0 }}>
              Leaving soon
            </span>
          )}
          <Link href={`/pool/${pool.id}`} className="btn-ghost btn btn-sm">
            Details
          </Link>
          {!pool.is_host && (
            <>
              {pool.is_member ? (
                <button
                  className="btn-danger btn btn-sm"
                  onClick={() => setModal("leave")}
                  disabled={loading}
                >
                  Leave
                </button>
              ) : (
                <Link
                  href={`/pool/${pool.id}`}
                  className="btn-solid btn btn-sm"
                  aria-disabled={pool.available_seats === 0}
                >
                  {pool.available_seats === 0 ? "Full" : "Choose seat"}
                </Link>
              )}
            </>
          )}
          {pool.is_host && (
            <span className="badge badge-neutral">Your pool</span>
          )}
        </div>
      </article>

      {modal === "leave" && (
        <Modal
          title="Leave this pool?"
          message="Your seat will be released and other students can take it."
          confirmLabel="Leave Pool"
          variant="danger"
          onConfirm={handleLeaveAction}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}
    </>
  );
}
