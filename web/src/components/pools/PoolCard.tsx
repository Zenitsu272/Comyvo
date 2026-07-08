"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { formatDeparture, timeUntil, isDepartingSoon, maskPhone, cn } from "@/lib/utils";

export interface Pool {
  id: string;
  from_location: string;
  to_location: string;
  departure_at: string;
  total_seats: number;
  available_seats: number;
  cost_per_person: number;
  notes: string | null;
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
  onJoin?: (id: string) => Promise<void>;
  onLeave?: (id: string) => Promise<void>;
}

export default function PoolCard({ pool, onJoin, onLeave }: PoolCardProps) {
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"join" | "leave" | null>(null);
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

  const handleAction = async (action: "join" | "leave") => {
    setLoading(true);
    setModal(null);
    try {
      if (action === "join") await onJoin?.(pool.id);
      else await onLeave?.(pool.id);
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
            <small>est. {Math.round(40 + Math.random() * 30)} min</small>
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
                <button
                  className="btn-solid btn btn-sm"
                  onClick={() => setModal("join")}
                  disabled={loading || pool.available_seats === 0}
                >
                  {pool.available_seats === 0 ? "Full" : "Join pool"}
                </button>
              )}
            </>
          )}
          {pool.is_host && (
            <span className="badge badge-neutral">Your pool</span>
          )}
        </div>
      </article>

      {modal === "join" && (
        <Modal
          title="Join this pool?"
          message={`${pool.from_location} → ${pool.to_location} · ₹${pool.cost_per_person} · ${formatDeparture(pool.departure_at)}`}
          confirmLabel="Join Pool"
          onConfirm={() => handleAction("join")}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}

      {modal === "leave" && (
        <Modal
          title="Leave this pool?"
          message="Your seat will be released and other students can take it."
          confirmLabel="Leave Pool"
          variant="danger"
          onConfirm={() => handleAction("leave")}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}
    </>
  );
}
