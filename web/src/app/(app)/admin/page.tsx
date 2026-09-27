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
  users: number;
}

interface PremiumRequest {
  id: string;
  user_id: string;
  note: string | null;
  created_at: string;
  user: { full_name: string | null; roll_number: string | null; email: string } | null;
}

interface ManagedUser {
  id: string;
  full_name: string | null;
  roll_number: string | null;
  email: string;
  role: "student" | "premium" | "admin";
  status: "active" | "suspended";
  created_at: string;
}

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<PremiumRequest[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total_pools: 0, open_reports: 0, premium_users: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/reports");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load the moderation console.");
        setReports(data.reports);
        setPremiumRequests(data.premium_requests);
        setUsers(data.users);
        setMetrics({
          total_pools: data.metrics.pools,
          open_reports: data.reports.filter((report: Report) => report.status === "open").length,
          premium_users: data.metrics.premium_users,
          users: data.metrics.users,
        });
      } catch (error) {
        toast(error instanceof Error ? error.message : "Could not load the moderation console.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAction = async (action: string, params: Record<string, string>) => {
    const key = `${action}:${params.userId || params.reportId || params.requestId}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The action could not be completed.");
      toast("Action completed.", "success");
      if (action === "resolve_report") {
        setReports((prev) => prev.map((r) => r.id === params.reportId ? { ...r, status: params.status } : r));
      } else if (action === "review_premium") {
        setPremiumRequests((previous) => previous.filter((request) => request.id !== params.requestId));
        if (params.status === "approved") {
          setUsers((previous) => previous.map((item) => item.id === params.userId ? { ...item, role: "premium" } : item));
        }
      } else if (action === "set_user_status") {
        setUsers((previous) => previous.map((item) => item.id === params.userId ? { ...item, status: params.status as ManagedUser["status"] } : item));
      } else if (action === "set_user_role") {
        setUsers((previous) => previous.map((item) => item.id === params.userId ? { ...item, role: params.role as ManagedUser["role"] } : item));
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "The action could not be completed.", "error");
    } finally {
      setBusyKey(null);
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
            { label: "Registered users", value: loading ? "—" : metrics.users },
            { label: "Total pools", value: loading ? "—" : metrics.total_pools },
            { label: "Premium users", value: loading ? "—" : metrics.premium_users },
          ].map((m) => (
            <article key={m.label} className="metric-card">
              <span>{m.label}</span>
              <strong>{m.value}</strong>
            </article>
          ))}
        </div>

        {premiumRequests.length > 0 && (
          <>
            <div className="section-heading" style={{ marginTop: 24 }}><h3>Premium requests</h3></div>
            <div className="queue">
              {premiumRequests.map((request) => (
                <div className="queue-row" key={request.id}>
                  <span className="badge badge-warning">Pending</span>
                  <p>{request.user?.full_name || request.user?.roll_number || request.user?.email}<small style={{ display: "block" }}>{request.note || "No note provided"}</small></p>
                  <strong>{new Date(request.created_at).toLocaleDateString("en-IN")}</strong>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-solid btn btn-sm" disabled={busyKey !== null} onClick={() => handleAction("review_premium", { requestId: request.id, userId: request.user_id, status: "approved" })}>Approve</button>
                    <button className="btn-ghost btn btn-sm" onClick={() => handleAction("review_premium", { requestId: request.id, status: "rejected" })}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-heading" style={{ marginTop: 24 }}>
          <h3>User management</h3>
        </div>

        {loading ? (
          <Skeleton height={120} />
        ) : users.length === 0 ? (
          <div className="empty-state"><h3>No users found</h3></div>
        ) : (
          <div className="queue">
            <div className="queue-row queue-head">
              <span>Status</span>
              <span>User</span>
              <span>Role</span>
              <span>Action</span>
            </div>
            {users.map((managedUser) => {
              const key = `set_user_status:${managedUser.id}`;
              return (
                <div className="queue-row" key={managedUser.id}>
                  <span className={`badge ${managedUser.status === "active" ? "badge-success" : "badge-danger"}`}>{managedUser.status}</span>
                  <p>
                    <strong style={{ color: "var(--ink)" }}>{managedUser.full_name || managedUser.roll_number || "Profile incomplete"}</strong>
                    <small style={{ display: "block" }}>{managedUser.email}</small>
                  </p>
                  <select
                    aria-label={`Role for ${managedUser.email}`}
                    value={managedUser.role}
                    disabled={busyKey !== null}
                    onChange={(event) => handleAction("set_user_role", { userId: managedUser.id, role: event.target.value })}
                  >
                    <option value="student">Student</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    className={`${managedUser.status === "active" ? "btn-danger" : "btn-solid"} btn btn-sm`}
                    disabled={busyKey !== null}
                    onClick={() => handleAction("set_user_status", { userId: managedUser.id, status: managedUser.status === "active" ? "suspended" : "active" })}
                  >
                    {busyKey === key ? "Saving…" : managedUser.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

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
                      onClick={() => handleAction("resolve_report", { reportId: report.id, status: "resolved" })}
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
