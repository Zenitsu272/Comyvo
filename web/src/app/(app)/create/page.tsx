"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const CAMPUSES = ["Coimbatore", "Chennai", "Bengaluru", "Kochi", "Mysuru", "Amritapuri"];

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    from_location: "Campus Main Gate",
    to_location: "Coimbatore Railway Station",
    departure_at: "",
    total_seats: "3",
    cost_per_person: "150",
    notes: "",
    campus: "Coimbatore",
    women_only: false,
    contact_visibility: "after_join" as "always" | "premium_only" | "after_join",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.departure_at) { toast("Pick a departure date and time.", "error"); return; }

    setLoading(true);
    const res = await fetch("/api/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        total_seats: Number(form.total_seats),
        cost_per_person: Number(form.cost_per_person),
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { toast(data.error, "error"); return; }
    toast("Pool published!", "success");
    router.push("/my-pools");
  };

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Host controls</p>
          <h1>Create a pool</h1>
        </div>
      </header>

      <div className="screen-content">
        <div className="create-layout">
          <form className="form-card" onSubmit={handleSubmit} aria-label="Create pool">
            <div className="section-heading">
              <p className="kicker">Trip details</p>
              <h2>Pool settings</h2>
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
              <label>
                <span>Departure date & time *</span>
                <input id="departure_at" name="departure_at" type="datetime-local" value={form.departure_at} onChange={handleChange} required />
              </label>
              <label>
                <span>Total seats</span>
                <input id="total_seats" name="total_seats" type="number" min="1" max="8" value={form.total_seats} onChange={handleChange} />
              </label>
              <label>
                <span>Cost per person (₹)</span>
                <input id="cost_per_person" name="cost_per_person" type="number" min="0" value={form.cost_per_person} onChange={handleChange} />
              </label>
              <label>
                <span>Campus</span>
                <select id="campus" name="campus" value={form.campus} onChange={handleChange}>
                  {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <label>
              <span>Notes</span>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Cab booked from main gate. Please arrive 10 minutes early." />
            </label>

            <div className="settings-list">
              <label className={`setting-row${form.women_only ? " highlighted" : ""}`}>
                <span>
                  <strong>Women-only pool</strong>
                  <small>Only women students can discover and request to join this pool.</small>
                </span>
                <input type="checkbox" name="women_only" checked={form.women_only} onChange={handleChange} />
              </label>

              <label className="setting-row">
                <span>
                  <strong>Phone visibility</strong>
                  <small>Who can see your phone number before joining?</small>
                </span>
                <select id="contact_visibility" name="contact_visibility" value={form.contact_visibility} onChange={handleChange}>
                  <option value="after_join">Only after joining</option>
                  <option value="premium_only">Premium members only</option>
                  <option value="always">Everyone (visible before join)</option>
                </select>
              </label>
            </div>

            <button type="submit" className="btn-solid btn btn-wide" disabled={loading}>
              {loading ? "Publishing…" : "Publish Pool"}
            </button>
          </form>

          {/* Phone preview */}
          <aside className="phone-preview" aria-label="Pool preview">
            <div className="phone-frame">
              <div className="phone-top" />
              <article className="mini-ride">
                <span className="badge badge-info">Preview</span>
                {form.women_only && <span className="badge badge-rose">Women-only</span>}
                <h3>{form.from_location || "From"} → {form.to_location || "To"}</h3>
                <p>
                  {form.departure_at
                    ? new Date(form.departure_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "Pick a date"
                  } · {form.total_seats} seats · ₹{form.cost_per_person}
                </p>
                {form.contact_visibility === "always" && (
                  <div className="mini-contact">
                    <span>Phone (visible to all)</span>
                    <strong>Your number</strong>
                  </div>
                )}
                {form.contact_visibility === "premium_only" && (
                  <>
                    <div className="mini-contact">
                      <span>Premium view</span>
                      <strong>Your number</strong>
                    </div>
                    <div className="mini-contact muted">
                      <span>Normal view</span>
                      <strong>********XX</strong>
                    </div>
                  </>
                )}
                {form.contact_visibility === "after_join" && (
                  <div className="mini-contact muted">
                    <span>Contact visible after joining</span>
                    <strong>********XX</strong>
                  </div>
                )}
                <button className="btn-solid btn btn-wide btn-sm">Join Pool</button>
              </article>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
