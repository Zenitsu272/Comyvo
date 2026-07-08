"use client";

import { useState, useEffect, useCallback } from "react";
import PoolCard, { Pool } from "@/components/pools/PoolCard";
import { PoolCardSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Search, Compass, SlidersHorizontal, ArrowUpDown, ShieldCheck } from "lucide-react";

export default function DiscoverPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    to: "",
    from: "",
    date: "",
    women_only: false,
    min_seats: "",
    sort_by: "soonest",
  });

  const fetchPools = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.to) params.set("to", filters.to);
    if (filters.from) params.set("from", filters.from);
    if (filters.date) params.set("date", filters.date);
    if (filters.women_only) params.set("women_only", "true");

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
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("You've joined the pool!", "success");
    fetchPools();
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

          {(filters.to || filters.from || filters.date || filters.women_only || filters.min_seats) && (
            <button
              type="button"
              className="filter-pill"
              onClick={() => setFilters({ to: "", from: "", date: "", women_only: false, min_seats: "", sort_by: "soonest" })}
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
            <h3>Route pulse</h3>
            <div className="map-card">
              <span className="map-pin campus" />
              <span className="map-pin station" />
              <span className="map-line" />
            </div>
            <p className="route-caption">Campus main gate to Coimbatore railway station</p>
            <div className="insight-list">
              <div>
                <span>Active pools</span>
                <strong>{pools.filter((p) => p.status === "active").length}</strong>
              </div>
              <div>
                <span>Leaving soon</span>
                <strong>{soon.length}</strong>
              </div>
              <div>
                <span>Avg fare</span>
                <strong>
                  {pools.length > 0
                    ? `₹${Math.round(pools.reduce((s, p) => s + Number(p.cost_per_person), 0) / pools.length)}`
                    : "—"}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
