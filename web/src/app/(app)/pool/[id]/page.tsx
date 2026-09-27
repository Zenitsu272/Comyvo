"use client";

import { useState, useEffect, use } from "react";
import { Pool } from "@/components/pools/PoolCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import DiscussionBoard from "@/components/pools/DiscussionBoard";
import SeatingChart from "@/components/pools/SeatingChart";
import { formatDeparture } from "@/lib/utils";
import { formatPoolPrice } from "@/lib/pricing";

interface Member {
  user_id: string;
  seat_no: number;
  users: { roll_number: string | null; full_name: string | null } | null;
}

interface PoolDetail extends Pool {
  members: Member[];
  host_phone_full: string | null;
  campus: string | null;
  viewer_id?: string;
  luggage_capacity?: string;
  car_type?: string;
}

export default function PoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Seating confirmation dialog
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  // Report Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Incorrect phone number");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchPool = async () => {
    const res = await fetch(`/api/pools/${id}`);
    if (!res.ok) { setLoading(false); return; }
    setPool(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchPool(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleJoin = async () => {
    if (selectedSeat === null) return;
    setActionLoading(true);
    const res = await fetch(`/api/pools/${id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seat_no: selectedSeat })
    });
    const data = await res.json();
    setActionLoading(false);
    setSelectedSeat(null);

    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Seat booked successfully! Joined the pool.", "success");
    fetchPool(); // Reload full seating allocation
  };

  const handleLeave = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/pools/${id}/leave`, { method: "DELETE" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Left the pool.", "info");
    fetchPool();
  };

  const handleReportSubmit = async () => {
    if (!reportDetails.trim()) {
      toast("Please add report description.", "error");
      return;
    }
    setSubmittingReport(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reported_user_id: pool?.host_id,
        pool_id: id,
        reason: `${reportReason}: ${reportDetails}`,
      }),
    });
    setSubmittingReport(false);
    if (!res.ok) {
      toast("Failed to submit report.", "error");
      return;
    }
    toast("Report filed successfully. Admins will review.", "success");
    setReportModalOpen(false);
    setReportDetails("");
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

  const luggageLabel = () => {
    const val = pool.luggage_capacity || "any";
    if (val === "backpacks") return "Backpacks / Small bags only";
    if (val === "trolleys") return "Large trolley luggage allowed";
    return "Any luggage size allowed";
  };

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

            {pool.via_route && (
              <div style={{ marginTop: "-6px", marginBottom: "16px", paddingLeft: "16px", display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  via {pool.via_route}
                </span>
              </div>
            )}

            {/* Seating Map */}
            <SeatingChart
              carType={pool.car_type ?? "sedan"}
              hostName={pool.host_roll ?? pool.host_name ?? "Host"}
              hostRoll={pool.host_roll}
              hostId={pool.host_id}
              members={pool.members}
              isMember={!!pool.is_member}
              isHost={!!pool.is_host}
              onSelectSeat={(seatNo) => setSelectedSeat(seatNo)}
              actionLoading={actionLoading}
            />

            {/* Meta */}
            <div className="ride-meta" style={{ marginTop: 24 }}>
              <div>
                <span>Host</span>
                <a href={`/profile/${pool.host_id}`} className="hover-teal" style={{ display: "block", color: "inherit", fontWeight: 700 }}>
                  {pool.host_roll ?? pool.host_name ?? "—"}
                </a>
              </div>
              <div>
                <span>Cost</span>
                <strong>{formatPoolPrice(pool)}</strong>
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
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {pool.is_member && (
                <button className="btn-danger btn" onClick={handleLeave} disabled={actionLoading}>
                  {actionLoading ? "Leaving…" : "Leave pool"}
                </button>
              )}
              {!pool.is_host && (
                <button className="btn-ghost btn" onClick={() => setReportModalOpen(true)}>
                  Report Pool / Host
                </button>
              )}
            </div>

            {/* ── Group discussion board (Only visible for host and members) ── */}
            {(pool.is_member || pool.is_host) && pool.viewer_id && (
              <DiscussionBoard poolId={id} currentUserId={pool.viewer_id} />
            )}
          </div>

          {/* Aside */}
          <div className="pool-detail-aside">
            {/* Members List */}
            <div style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
              <h3>Members ({pool.members.length}/{pool.total_seats})</h3>
              {pool.members.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No members yet.</p>
              ) : (
                <div className="member-strip" style={{ flexWrap: "wrap", gap: 8 }}>
                  {pool.members.map((m) => (
                    <a key={m.user_id} href={`/profile/${m.user_id}`} title={m.users?.full_name ?? "View profile"}>
                      <span className="member-avatar">
                        {(m.users?.full_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </a>
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
                <div><span>Luggage</span><strong style={{ fontSize: "0.82rem" }}>{luggageLabel()}</strong></div>
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

            {/* Savings & Splits Card */}
            <div style={{
              padding: 20,
              border: "1.5px solid var(--line)",
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--teal-weak, #e3f3ed), #ffffff)",
              boxShadow: "var(--shadow-sm)"
            }}>
              <h3 style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6, color: "var(--teal)" }}>
                <span>💰</span> Trip Split & Savings
              </h3>
              {pool.pricing_mode === "split_equally" ? (
                <p className="helper">Split equally: divide the final fare by the number of people who travel, including the host. The amount is agreed after the trip; empty seats are not included. Comyvo does not collect payments.</p>
              ) : (<>
              <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>
                Estimated transit split and student savings.
              </p>
              
              <div style={{ display: "grid", gap: 10, fontSize: "0.85rem", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                  <span>Total Vehicle Cost:</span>
                    <strong>₹{(pool.cost_per_person ?? 0) * pool.total_seats}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink)" }}>
                  <span>Your Carpool Share:</span>
                  <strong style={{ color: "var(--teal)" }}>₹{pool.cost_per_person}</strong>
                </div>
                <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>Solo Travel Cost:</span>
                  <span style={{ color: "var(--red)" }}>
                    ₹{(pool.cost_per_person ?? 0) * pool.total_seats}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>Your Net Savings:</span>
                  <span style={{ color: "var(--mint)" }}>
                    ₹{Math.max(0, ((pool.cost_per_person ?? 0) * pool.total_seats) - (pool.cost_per_person ?? 0))}
                  </span>
                </div>
              </div>

              <div style={{
                fontSize: "0.76rem",
                color: "var(--teal)",
                background: "rgba(11, 143, 111, 0.08)",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px dashed rgba(11, 143, 111, 0.3)",
                lineHeight: 1.4
              }}>
                By split-sharing this {pool.car_type || "ride"} instead of travelling solo, you save approximately <strong>{Math.round((1 - 1 / pool.total_seats) * 100)}%</strong> of the fare.
              </div>
              </>)}
            </div>
          </div>
        </div>
      </div>

      {/* Seating Confirmation Modal */}
      {selectedSeat !== null && (
        <Modal
          title="Confirm Seat Booking"
          message={`Are you sure you want to book Seat #${selectedSeat} in this pool?`}
          confirmLabel="Book Seat"
          onConfirm={handleJoin}
          onCancel={() => setSelectedSeat(null)}
          loading={actionLoading}
        />
      )}

      {reportModalOpen && (
        <Modal
          title="Report this pool or host"
          message="Help keep the campus safe. Let us know what is wrong."
          confirmLabel="Submit Report"
          variant="danger"
          onConfirm={handleReportSubmit}
          onCancel={() => setReportModalOpen(false)}
          loading={submittingReport}
        >
          <div style={{ display: "grid", gap: 12, margin: "14px 0" }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Reason</span>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="Incorrect phone number">Incorrect phone number</option>
                <option value="Host no-show">Host did not show up</option>
                <option value="Inappropriate behaviour">Inappropriate behavior</option>
                <option value="Scam / Overpricing">Scam or Overpricing</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Additional details</span>
              <textarea
                placeholder="Please describe the issue in detail..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                required
              />
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
