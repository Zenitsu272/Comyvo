"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PoolCard, { Pool } from "@/components/pools/PoolCard";
import { PoolCardSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Search, Compass, SlidersHorizontal, ArrowUpDown, ShieldCheck } from "lucide-react";

export default function DiscoverPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPulseRoute, setSelectedPulseRoute] = useState<"station" | "bus" | "airport" | "gandhipuram">("station");

  const mapConfig = {
    station: {
      caption: "Campus Main Gate to Coimbatore Railway Station",
      distance: "22 km",
      campus: { left: "19%", top: "59%" },
      destination: { right: "18%", top: "30%" },
      line: { left: "21%", top: "62%", width: "60%", transform: "rotate(-26deg)" }
    },
    bus: {
      caption: "Campus Main Gate to Ettimadai Bus Stop",
      distance: "2 km (Local shuttle)",
      campus: { left: "25%", top: "70%" },
      destination: { right: "45%", top: "50%" },
      line: { left: "27%", top: "72%", width: "30%", transform: "rotate(-40deg)" }
    },
    airport: {
      caption: "Campus Main Gate to Coimbatore Airport (CJB)",
      distance: "31 km",
      campus: { left: "15%", top: "65%" },
      destination: { right: "10%", top: "15%" },
      line: { left: "17%", top: "68%", width: "75%", transform: "rotate(-35deg)" }
    },
    gandhipuram: {
      caption: "Campus Main Gate to Gandhipuram Bus Stand",
      distance: "24 km",
      campus: { left: "20%", top: "60%" },
      destination: { right: "15%", top: "25%" },
      line: { left: "22%", top: "63%", width: "65%", transform: "rotate(-28deg)" }
    }
  };

  const pulsePools = useMemo(() => {
    return pools.filter((p) => {
      const to = p.to_location.toLowerCase();
      const from = p.from_location.toLowerCase();
      const via = (p.via_route ?? "").toLowerCase();
      
      if (selectedPulseRoute === "station") {
        return to.includes("station") || to.includes("railway") || via.includes("station") || via.includes("railway");
      }
      if (selectedPulseRoute === "bus") {
        return to.includes("bus") || to.includes("ettimadai") || via.includes("bus") || via.includes("ettimadai") || from.includes("ettimadai");
      }
      if (selectedPulseRoute === "airport") {
        return to.includes("airport") || via.includes("airport");
      }
      if (selectedPulseRoute === "gandhipuram") {
        return to.includes("gandhipuram") || via.includes("gandhipuram");
      }
      return false;
    });
  }, [pools, selectedPulseRoute]);

  const pulseActiveCount = pulsePools.filter((p) => p.status === "active" || p.status === "full").length;
  const pulseSoonCount = pulsePools.filter((p) => {
    const diff = new Date(p.departure_at).getTime() - Date.now();
    return diff > 0 && diff <= 5 * 3600000;
  }).length;
  const pulseAvgFare = useMemo(() => {
    if (pulsePools.length === 0) return 0;
    const sum = pulsePools.reduce((s, p) => s + Number(p.cost_per_person), 0);
    return Math.round(sum / pulsePools.length);
  }, [pulsePools]);
  const [filters, setFilters] = useState({
    to: "",
    from: "",
    date: "",
    women_only: false,
    min_seats: "",
    car_type: "",
    sort_by: "soonest",
  });

  const fetchPools = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.to) params.set("to", filters.to);
    if (filters.from) params.set("from", filters.from);
    if (filters.date) params.set("date", filters.date);
    if (filters.women_only) params.set("women_only", "true");
    if (filters.car_type) params.set("car_type", filters.car_type);

    const res = await fetch(`/api/pools?${params}`);
    if (!res.ok) {
      toast("Failed to load pools.", "error");
      setLoading(false);
      return;
    }
    let data: Pool[] = await res.json();

    // Client-side filtering & sorting
    if (filters.min_seats) {
      data = data.filter((p) => p.available_seats >= Number(filters.min_seats));
    }

    if (filters.sort_by === "soonest") {
      data.sort((a, b) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime());
    } else if (filters.sort_by === "cheapest") {
      data.sort((a, b) => a.cost_per_person - b.cost_per_person);
    } else if (filters.sort_by === "seats") {
      data.sort((a, b) => b.available_seats - a.available_seats);
    }

    setPools(data);
    setLoading(false);
  }, [filters]);

  // Real-time search trigger when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPools();
    }, 250); // slight debounce for text input typing
    return () => clearTimeout(timer);
  }, [filters, fetchPools]);

  const handleJoin = async (id: string) => {
    const res = await fetch(`/api/pools/${id}/join`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { toast(data.error, "error"); return false; }
    toast("You've joined the pool!", "success");
    fetchPools();
    return true;
  };

  const handleLeave = async (id: string) => {
    const res = await fetch(`/api/pools/${id}/leave`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Left the pool.", "info");
    fetchPools();
  };

  const soon = pools.filter((p) => {
    const diff = new Date(p.departure_at).getTime() - Date.now();
    return diff > 0 && diff <= 5 * 3600000;
  });

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Amrita verified network</p>
          <h1>Discover rides</h1>
        </div>
        <div className="top-actions">
          <a href="/create" className="btn-solid btn btn-sm">+ New pool</a>
        </div>
      </header>

      <div className="screen-content">
        {/* ── Hero ── */}
        <div className="hero-panel">
          <div>
            <p className="kicker">Amrita verified network</p>
            <h2>Verified campus rides, sorted by what matters first</h2>
            <p>Search by destination, privacy preference, seats, and time. Pools leaving soon rise to the top.</p>
            {soon.length > 0 && (
              <div className="trip-summary">
                <span className="summary-label">Next departure</span>
                <strong>{(() => { const diff = new Date(soon[0].departure_at).getTime() - Date.now(); const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); return `${h}h ${m}m`; })()}</strong>
                <small>{soon[0].from_location} → {soon[0].to_location}</small>
              </div>
            )}
          </div>
        </div>

        {/* ── Ettimadai Quick Auto-Share (Frequent Route) ── */}
        <div style={{
          background: "var(--panel)",
          border: "1.5px solid var(--line)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🛺</span> Ettimadai Quick Auto-Share
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
              Share auto fares with other students on the most frequent route (3 seats).
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-sm"
              style={{
                background: filters.from === "Campus Main Gate" && filters.to === "Ettimadai Bus Stop" && filters.car_type === "auto"
                  ? "var(--teal)"
                  : "var(--panel-soft)",
                color: filters.from === "Campus Main Gate" && filters.to === "Ettimadai Bus Stop" && filters.car_type === "auto"
                  ? "#fff"
                  : "var(--ink)",
                borderColor: "var(--line-strong)"
              }}
              onClick={() => setFilters((p) => ({
                ...p,
                from: "Campus Main Gate",
                to: "Ettimadai Bus Stop",
                car_type: "auto"
              }))}
            >
              To Bus Stop 🛺
            </button>
            <button
              className="btn btn-sm"
              style={{
                background: filters.from === "Ettimadai Bus Stop" && filters.to === "Campus Main Gate" && filters.car_type === "auto"
                  ? "var(--teal)"
                  : "var(--panel-soft)",
                color: filters.from === "Ettimadai Bus Stop" && filters.to === "Campus Main Gate" && filters.car_type === "auto"
                  ? "#fff"
                  : "var(--ink)",
                borderColor: "var(--line-strong)"
              }}
              onClick={() => setFilters((p) => ({
                ...p,
                from: "Ettimadai Bus Stop",
                to: "Campus Main Gate",
                car_type: "auto"
              }))}
            >
              From Bus Stop 🛺
            </button>
            {(filters.from || filters.to || filters.car_type) && (
              <button
                className="btn-ghost btn btn-sm"
                onClick={() => setFilters((p) => ({
                  ...p,
                  from: "",
                  to: "",
                  car_type: ""
                }))}
                style={{ fontSize: "0.78rem" }}
              >
                Reset
              </button>
            )}
            <a
              href={`/create?from=${encodeURIComponent(filters.from || "Campus Main Gate")}&to=${encodeURIComponent(filters.to || "Ettimadai Bus Stop")}&car_type=auto&total_seats=3&cost_per_person=30`}
              className="btn-solid btn btn-sm"
              style={{ background: "#4f46e5", borderColor: "#4f46e5" }}
            >
              + Create Auto Share
            </a>
          </div>
        </div>

        {/* ── Search (Real-time trigger) ── */}
        <div className="search-panel">
          <label>
            <span>Destination</span>
            <input
              value={filters.to}
              onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              placeholder="Railway station…"
              aria-label="Search destination"
            />
          </label>
          <label>
            <span>Leaving from</span>
            <input
              value={filters.from}
              onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              placeholder="Campus main gate…"
              aria-label="Leaving from"
            />
          </label>
          <label>
            <span>Date</span>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))}
              aria-label="Date"
            />
          </label>
        </div>

        {/* ── Filter Pills & Sorters ── */}
        <div className="filter-bar" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className={`filter-pill ${filters.women_only ? "active-teal" : ""}`}
            onClick={() => setFilters((prev) => ({ ...prev, women_only: !prev.women_only }))}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <SlidersHorizontal size={14} />
            Women only
          </button>

          <select
            className="filter-pill"
            value={filters.min_seats}
            onChange={(e) => setFilters((prev) => ({ ...prev, min_seats: e.target.value }))}
            style={{ appearance: "none", paddingRight: 24 }}
            aria-label="Filter by minimum seats"
          >
            <option value="">Any seats available</option>
            <option value="1">1+ seats left</option>
            <option value="2">2+ seats left</option>
            <option value="3">3+ seats left</option>
          </select>

          <select
            className="filter-pill"
            value={filters.sort_by}
            onChange={(e) => setFilters((prev) => ({ ...prev, sort_by: e.target.value }))}
            style={{ appearance: "none", paddingRight: 24, display: "inline-flex", alignItems: "center" }}
            aria-label="Sort by"
          >
            <option value="soonest">Sort: Soonest departure</option>
            <option value="cheapest">Sort: Cheapest fare</option>
            <option value="seats">Sort: Available seats</option>
          </select>

          {(filters.to || filters.from || filters.date || filters.women_only || filters.min_seats || filters.car_type) && (
            <button
              type="button"
              className="filter-pill"
              onClick={() => setFilters({ to: "", from: "", date: "", women_only: false, min_seats: "", car_type: "", sort_by: "soonest" })}
              style={{ background: "none", border: "1.5px dashed var(--red)", color: "var(--red)" }}
            >
              Reset filters
            </button>
          )}
        </div>

        {/* ── Grid ── */}
        <div className="discover-grid">
          <section className="rides-list" aria-label="Available pools">
            {loading ? (
              <>
                <PoolCardSkeleton />
                <PoolCardSkeleton />
                <PoolCardSkeleton />
              </>
            ) : pools.length === 0 ? (
              <div className="empty-state">
                <Search size={32} style={{ color: "var(--muted)", marginBottom: 8 }} />
                <h3>No pools found</h3>
                <p>Try adjusting your search filters, or create a new pool for your route.</p>
                <a href="/create" className="btn-solid btn btn-sm">Create pool</a>
              </div>
            ) : (
              pools.map((pool) => (
                <PoolCard key={pool.id} pool={pool} onJoin={handleJoin} onLeave={handleLeave} />
              ))
            )}
          </section>

          {/* ── Insight panel ── */}
          <aside className="insight-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Route pulse</h3>
              <select
                value={selectedPulseRoute}
                onChange={(e) => setSelectedPulseRoute(e.target.value as any)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--line-strong)",
                  background: "var(--panel-soft)",
                  cursor: "pointer"
                }}
              >
                <option value="station">Railway Station</option>
                <option value="bus">Ettimadai Bus Stop</option>
                <option value="gandhipuram">Gandhipuram</option>
                <option value="airport">Airport</option>
              </select>
            </div>
            
            <div className="map-card" style={{ transition: "all 0.5s ease" }}>
              <span className="map-pin campus" style={{
                left: mapConfig[selectedPulseRoute].campus.left,
                top: mapConfig[selectedPulseRoute].campus.top,
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
              }} />
              <span className="map-pin station" style={{
                right: mapConfig[selectedPulseRoute].destination.right,
                top: mapConfig[selectedPulseRoute].destination.top,
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                background: "var(--navy)"
              }} />
              <span className="map-line" style={{
                left: mapConfig[selectedPulseRoute].line.left,
                top: mapConfig[selectedPulseRoute].line.top,
                width: mapConfig[selectedPulseRoute].line.width,
                transform: mapConfig[selectedPulseRoute].line.transform,
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
              }} />
            </div>

            <p className="route-caption" style={{ display: "flex", justifyContent: "space-between", margin: 0 }}>
              <span>{mapConfig[selectedPulseRoute].caption}</span>
              <strong style={{ color: "var(--teal)" }}>{mapConfig[selectedPulseRoute].distance}</strong>
            </p>

            <div className="insight-list">
              <div>
                <span>Active pools</span>
                <strong style={{ transition: "all 0.3s ease" }}>{pulseActiveCount}</strong>
              </div>
              <div>
                <span>Leaving soon</span>
                <strong style={{ transition: "all 0.3s ease" }}>{pulseSoonCount}</strong>
              </div>
              <div>
                <span>Avg fare</span>
                <strong style={{ transition: "all 0.3s ease" }}>
                  {pulseAvgFare > 0 ? `₹${pulseAvgFare}` : "—"}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
