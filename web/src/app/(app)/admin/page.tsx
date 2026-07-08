"use client";

import { useState, useEffect } from "react";
import { toast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";


interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { roll_number: string | null; full_name: string | null } | null;
  reported: { roll_number: string | null; full_name: string | null } | null;
  pool: { from_location: string; to_location: string } | null;
}

interface Metrics {
  total_pools: number;
  open_reports: number;
  premium_users: number;
}

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total_pools: 0, open_reports: 0, premium_users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) { setLoading(false); return; }
      const data: Report[] = await res.json();
      setReports(data);
      setMetrics({
        total_pools: 0,
        open_reports: data.filter((r) => r.status === "open").length,
        premium_users: 0,
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAction = async (action: string, params: Record<string, string>) => {
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Action completed.", "success");
    if (action === "resolve_report") {
      setReports((prev) => prev.map((r) => r.id === params.reportId ? { ...r, status: "resolved" } : r));
    }
  };

  const badgeClass = (status: string) => {
    if (status === "open") return "badge-danger";
    if (status === "resolved") return "badge-success";
    return "badge-neutral";
  };

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Safety console</p>
          <h1>Moderation</h1>
        </div>
      </header>

      <div className="screen-content">
        <div className="section-heading">
          <h2>Moderation overview</h2>
        </div>

        {/* Metrics */}
        <div className="metric-grid">
          {[
            { label: "Open reports", value: loading ? "—" : metrics.open_reports },
            { label: "Total reports", value: loading ? "—" : reports.length },
            { label: "Resolved", value: loading ? "—" : reports.filter((r) => r.status === "resolved").length },
            { label: "Dismissed", value: loading ? "—" : reports.filter((r) => r.status === "dismissed").length },
          ].map((m) => (
            <article key={m.label} className="metric-card">
              <span>{m.label}</span>
              <strong>{m.value}</strong>
            </article>
          ))}
        </div>

        {/* Reports queue */}
        <div className="section-heading" style={{ marginTop: 24 }}>
          <h3>Reports queue</h3>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 1 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={52} />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <h3>No reports</h3>
            <p>All clear — no open reports at this time.</p>
          </div>
        ) : (
          <div className="queue">
            <div className="queue-row queue-head">
              <span>Status</span>
              <span>Issue</span>
              <span>Reporter</span>
              <span>Action</span>
            </div>
            {reports.map((report) => (
              <div key={report.id} className="queue-row">
                <span className={`badge ${badgeClass(report.status)}`}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
                <p>
                  {report.reason}
                  {report.pool && (
                    <small style={{ display: "block", color: "var(--faint)" }}>
                      {report.pool.from_location} → {report.pool.to_location}
                    </small>
                  )}
                </p>
                <strong style={{ fontSize: "0.84rem" }}>
                  {report.reporter?.roll_number ?? report.reporter?.full_name ?? "—"}
                </strong>
                {report.status === "open" ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn-solid btn btn-sm"
                      onClick={() => handleAction("resolve_report", { reportId: report.id })}
                    >
                      Resolve
                    </button>
                  </div>
                ) : (
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Done</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
