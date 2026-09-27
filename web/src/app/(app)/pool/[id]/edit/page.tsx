"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import CostFields from "@/components/pools/CostFields";

const CAMPUSES = ["Coimbatore", "Chennai", "Bengaluru", "Kochi", "Mysuru", "Amritapuri"];

export default function EditPoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    from_location: "",
    to_location: "",
    via_route: "",
    departure_at: "",
    total_seats: "",
    cost_per_person: "",
    pricing_mode: "fixed",
    notes: "",
    campus: "",
    luggage_capacity: "any",
    women_only: false,
    contact_visibility: "after_join" as "always" | "premium_only" | "after_join",
    status: "active" as "active" | "cancelled" | "completed",
  });

  useEffect(() => {
    const fetchPool = async () => {
      const res = await fetch(`/api/pools/${id}`);
      if (!res.ok) {
        toast("Failed to load pool details", "error");
        router.push("/my-pools");
        return;
      }
      const data = await res.json();
      if (!data.is_host) {
        toast("You are not authorized to edit this pool.", "error");
        router.push("/my-pools");
        return;
      }
      // Format datetime-local string (YYYY-MM-DDTHH:MM)
      const depDate = new Date(data.departure_at);
      const formattedDate = new Date(depDate.getTime() - depDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setForm({
        from_location: data.from_location,
        to_location: data.to_location,
        via_route: data.via_route ?? "",
        departure_at: formattedDate,
        total_seats: String(data.total_seats),
        cost_per_person: data.cost_per_person == null ? "" : String(data.cost_per_person),
        pricing_mode: data.pricing_mode ?? "fixed",
        notes: data.notes ?? "",
        campus: data.campus ?? "Coimbatore",
        luggage_capacity: data.luggage_capacity ?? "any",
        women_only: data.women_only,
        contact_visibility: data.contact_visibility,
        status: data.status === "full" ? "active" : data.status,
      });
      setLoading(false);
    };
    fetchPool();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/pools/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_location: form.from_location,
        to_location: form.to_location,
        via_route: form.via_route,
        departure_at: new Date(form.departure_at).toISOString(),
        cost_per_person: form.pricing_mode === "split_equally" ? null : Number(form.cost_per_person),
        pricing_mode: form.pricing_mode,
        notes: form.notes,
        campus: form.campus,
        luggage_capacity: form.luggage_capacity,
        women_only: form.women_only,
        contact_visibility: form.contact_visibility,
        ...(form.status === "cancelled" || form.status === "completed" ? { status: form.status } : {}),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast(data.error ?? "Failed to update pool.", "error");
      return;
    }

    toast("Pool details updated!", "success");
    router.push("/my-pools");
  };

  if (loading) {
    return (
      <>
        <header className="topbar"><div className="title-block"><Skeleton height={32} width={180} /></div></header>
        <div className="screen-content"><Skeleton height={350} /></div>
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Pool editor</p>
          <h1>Edit ride settings</h1>
        </div>
      </header>

      <div className="screen-content">
        <div className="create-layout">
          <form className="form-card" onSubmit={handleSubmit} aria-label="Edit pool settings">
            <div className="section-heading">
              <p className="kicker">Host controls</p>
              <h2>Update pool</h2>
            </div>

            <div className="field-grid">
              <label>
                <span>From *</span>
                <input id="from_location" name="from_location" value={form.from_location} onChange={handleChange} required />
              </label>
              <label>
                <span>To *</span>
                <input id="to_location" name="to_location" value={form.to_location} onChange={handleChange} required />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Via / Stopovers (optional)</span>
                <input
                  id="via_route"
                  name="via_route"
                  value={form.via_route}
                  onChange={handleChange}
                  placeholder="e.g. Gandhipuram, Hope College (comma separated)"
                />
              </label>
              <label>
                <span>Departure date & time *</span>
                <input id="departure_at" name="departure_at" type="datetime-local" value={form.departure_at} onChange={handleChange} required />
              </label>
              <label>
                <span>Total seats</span>
                <input id="total_seats" name="total_seats" type="number" min="2" max="8" value={form.total_seats} readOnly style={{ background: "var(--panel-soft)", color: "var(--muted)", cursor: "not-allowed" }} />
              </label>
              <CostFields mode={form.pricing_mode} cost={form.cost_per_person} onChange={handleChange} />
              <label>
                <span>Campus</span>
                <select id="campus" name="campus" value={form.campus} onChange={handleChange}>
                  {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>
                <span>Luggage Capacity</span>
                <select id="luggage_capacity" name="luggage_capacity" value={form.luggage_capacity} onChange={handleChange}>
                  <option value="any">Any luggage size</option>
                  <option value="backpacks">Backpacks / Small bags only</option>
                  <option value="trolleys">Large trolley luggage allowed</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Pool Status</span>
                <select id="status" name="status" value={form.status} onChange={handleChange}>
                  <option value="active">Active (Available to join)</option>
                  <option value="cancelled">Cancelled (Trip aborted)</option>
                  <option value="completed">Completed (Trip finished)</option>
                </select>
              </label>
            </div>

            <label>
              <span>Notes</span>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Update notes here..." />
            </label>

            <div className="settings-list">
              <label className={`setting-row${form.women_only ? " highlighted" : ""}`}>
                <span>
                  <strong>Women-only pool</strong>
                  <small>Only women students can join this pool.</small>
                </span>
                <input type="checkbox" name="women_only" checked={form.women_only} onChange={handleChange} />
              </label>

              <label className="setting-row">
                <span>
                  <strong>Phone visibility</strong>
                  <small>Who can see your phone number?</small>
                </span>
                <select id="contact_visibility" name="contact_visibility" value={form.contact_visibility} onChange={handleChange}>
                  <option value="after_join">Only after joining</option>
                  <option value="premium_only">Premium members only</option>
                  <option value="always">Everyone (visible before join)</option>
                </select>
              </label>
            </div>

            <button type="submit" className="btn-solid btn btn-wide" disabled={saving}>
              {saving ? "Saving changes…" : "Save Pool Settings"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
