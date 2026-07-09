"use client";

import { Crown, Users } from "lucide-react";

interface Member {
  user_id: string;
  seat_no: number;
  users: { roll_number: string | null; full_name: string | null } | null;
}

interface SeatingChartProps {
  carType: string;
  hostName: string;
  hostRoll: string | null;
  hostId: string;
  members: Member[];
  isMember: boolean;
  isHost: boolean;
  onSelectSeat: (seatNo: number) => void;
  actionLoading: boolean;
}

export default function SeatingChart({
  carType = "sedan",
  hostName,
  hostRoll,
  hostId,
  members,
  isMember,
  isHost,
  onSelectSeat,
  actionLoading,
}: SeatingChartProps) {
  // Find member in a specific seat
  const getMemberInSeat = (seatNo: number) => {
    return members.find((m) => m.seat_no === seatNo);
  };

  // Helper to render seat node
  const renderSeat = (seatNo: number, label: string) => {
    const occupant = getMemberInSeat(seatNo);

    if (occupant) {
      const name = occupant.users?.full_name ?? "Member";
      const roll = occupant.users?.roll_number ?? "Joined";
      const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

      return (
        <a
          href={`/profile/${occupant.user_id}`}
          key={seatNo}
          className="seat-slot occupied"
          title={`${name} (${roll})`}
          style={{ textDecoration: "none" }}
        >
          <div className="seat-avatar">{initials}</div>
          <span className="seat-label">{label}</span>
        </a>
      );
    }

    // Empty seat
    const disabled = isMember || isHost || actionLoading;

    return (
      <button
        key={seatNo}
        type="button"
        className="seat-slot empty"
        onClick={() => onSelectSeat(seatNo)}
        disabled={disabled}
        title={disabled ? "You are already in this pool" : `Click to book ${label}`}
      >
        <div className="seat-plus">+</div>
        <span className="seat-label">{label}</span>
      </button>
    );
  };

  return (
    <div className="seating-chart-container" style={{ margin: "24px 0", padding: 24, border: "1.5px solid var(--line)", borderRadius: 18, background: "var(--panel)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Interactive Seating Map</h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
            Select an empty seat to join the pool.
          </p>
        </div>
        <span className="badge badge-info" style={{ textTransform: "uppercase" }}>
          {carType === "auto" ? "🛺 Auto / TukTuk" : carType === "suv" ? "🚘 SUV / UberXL" : "🚗 Sedan / UberGo"}
        </span>
      </div>

      <div className="car-cabin-frame">
        {/* Front Row */}
        <div className="cabin-row">
          {/* Driver seat (Hired Driver) */}
          <div className="seat-slot occupied driver-seat" title="Hired Driver">
            <div className="seat-avatar driver-avatar" style={{ background: "var(--muted, #475569)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {carType === "auto" ? "🛺" : "👨‍✈️"}
            </div>
            <span className="seat-label">Driver</span>
          </div>

          {/* Host Seat (Seat 1) */}
          {carType !== "auto" && (
            <a
              href={`/profile/${hostId}`}
              className="seat-slot occupied host-seat"
              title={`Host: ${hostName} (${hostRoll || ""})`}
              style={{ textDecoration: "none" }}
            >
              <div className="seat-avatar host-avatar">
                <Crown size={12} style={{ position: "absolute", top: -8, color: "var(--amber)" }} />
                {hostName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span className="seat-label">Host</span>
            </a>
          )}
        </div>

        {/* Middle Row (SUV only) */}
        {carType === "suv" && (
          <div className="cabin-row middle-row">
            {renderSeat(2, "Mid Left")}
            {renderSeat(3, "Mid Center")}
            {renderSeat(4, "Mid Right")}
          </div>
        )}

        {/* Back Row */}
        <div className="cabin-row back-row">
          {carType === "auto" ? (
            <>
              {/* Host is Seat 1 */}
              <a
                href={`/profile/${hostId}`}
                className="seat-slot occupied host-seat"
                title={`Host: ${hostName} (${hostRoll || ""})`}
                style={{ textDecoration: "none" }}
              >
                <div className="seat-avatar host-avatar">
                  <Crown size={12} style={{ position: "absolute", top: -8, color: "var(--amber)" }} />
                  {hostName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="seat-label">Left (Host)</span>
              </a>
              {renderSeat(2, "Center")}
              {renderSeat(3, "Right")}
            </>
          ) : carType === "sedan" ? (
            <>
              {renderSeat(2, "Back Left")}
              {renderSeat(3, "Back Center")}
              {renderSeat(4, "Back Right")}
            </>
          ) : (
            <>
              {renderSeat(5, "Back Left")}
              {renderSeat(6, "Back Right")}
            </>
          )}
        </div>
      </div>

      {/* Cabin Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 24, fontSize: "0.78rem", fontWeight: 700, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--muted, #475569)" }} />
          <span>Driver (Hired)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--teal)" }} />
          <span>Host Student</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--panel-soft)", border: "1px solid var(--line)" }} />
          <span>Rider (Joined)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "none", border: "1.5px dashed var(--teal)" }} />
          <span>Available seat</span>
        </div>
      </div>
    </div>
  );
}
