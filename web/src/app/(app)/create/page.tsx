"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const CAMPUSES = ["Coimbatore", "Chennai", "Bengaluru", "Kochi", "Mysuru", "Amritapuri"];

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    from_location: "Campus Main Gate",
    to_location: "Coimbatore Railway Station",
    via_route: "",
    car_type: "sedan",
    departure_at: "",
    total_seats: "4",
    cost_per_person: "150",
    notes: "",
    campus: "Coimbatore",
    luggage_capacity: "any",
    women_only: false,
    contact_visibility: "after_join" as "always" | "premium_only" | "after_join",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      const to = params.get("to");
      const car = params.get("car_type");
      const seats = params.get("total_seats");
      const cost = params.get("cost_per_person");

      setForm((prev) => ({
        ...prev,
        from_location: from || prev.from_location,
        to_location: to || prev.to_location,
        car_type: car || prev.car_type,
        total_seats: seats || (car === "auto" ? "3" : car === "suv" ? "6" : prev.total_seats),
        cost_per_person: cost || (car === "auto" ? "30" : prev.cost_per_person),
      }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === "car_type") {
      let seats = "3"; // auto
      if (value === "sedan") seats = "4";
      if (value === "suv") seats = "6";
      setForm((prev) => ({
        ...prev,
        car_type: value,
        total_seats: seats,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      }));
    }
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
                <span>Vehicle Type</span>
                <select id="car_type" name="car_type" value={form.car_type} onChange={handleChange}>
                  <option value="sedan">🚗 Sedan (UberGo/Cab – 3 passengers)</option>
                  <option value="suv">🚘 SUV (UberXL/Cab – 6 passengers)</option>
                  <option value="auto">🛺 Auto / TukTuk (3 passengers)</option>
                </select>
              </label>
              <label>
                <span>Available Seats (Auto-Set)</span>
                <input id="total_seats" name="total_seats" type="number" value={form.total_seats} readOnly style={{ background: "var(--panel-soft)", color: "var(--muted)", cursor: "not-allowed" }} />
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
              <label>
                <span>Luggage Capacity</span>
                <select id="luggage_capacity" name="luggage_capacity" value={form.luggage_capacity} onChange={handleChange}>
                  <option value="any">Any luggage size</option>
                  <option value="backpacks">Backpacks / Small bags only</option>
                  <option value="trolleys">Large trolley luggage allowed</option>
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
                {form.via_route && (
                  <p style={{ fontSize: "0.82rem", color: "var(--teal)", margin: "4px 0", fontWeight: 600 }}>
                    via {form.via_route}
                  </p>
                )}
                <p>
                  {form.departure_at
                    ? new Date(form.departure_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "Pick a date"
                  } · {form.total_seats} seats · ₹{form.cost_per_person}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "4px 0 10px" }}>
                  Luggage: {form.luggage_capacity === "backpacks" ? "Backpacks only" : form.luggage_capacity === "trolleys" ? "Trolleys allowed" : "Any size allowed"}
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
