import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Commuto — Verified Campus Carpool for Amrita Students",
  description:
    "Find or host carpools with verified Amrita students. Safe, affordable rides to Coimbatore railway station, airport, and beyond.",
};

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Nav ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid var(--line)", background: "var(--panel)" }}>
        <div className="brand" style={{ margin: 0 }}>
          <span className="brand-mark">C</span>
          <span>
            <strong>Commuto</strong>
            <small>Campus carpool</small>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" className="btn-ghost btn btn-sm">Sign in</Link>
          <Link href="/login" className="btn-solid btn btn-sm">Get started</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "80px 36px 60px", textAlign: "center" }}>
        <p className="kicker">Amrita verified network</p>
        <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
          Carpool with verified <br />Amrita students
        </h1>
        <p style={{ fontSize: "1.2rem", color: "var(--muted)", maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.6, fontWeight: 600 }}>
          Find rides to the railway station, airport, or anywhere nearby. Every user verified with a college email.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" className="btn-solid btn" style={{ minHeight: 52, padding: "0 28px", fontSize: "1rem" }}>
            Find a ride →
          </Link>
          <Link href="/login" className="btn-ghost btn" style={{ minHeight: 52, padding: "0 28px", fontSize: "1rem" }}>
            Create a pool
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 960, margin: "0 auto 80px", padding: "0 36px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {[
          { icon: "🎓", title: "College email verified", desc: "Only @amrita.edu addresses. Every user is a real student." },
          { icon: "🔒", title: "Privacy controls", desc: "Phone numbers masked until join. Premium members get early contact visibility." },
          { icon: "👩‍🎓", title: "Women-only pools", desc: "Hosts can restrict their pool to women students for added comfort." },
          { icon: "⚡", title: "Leaving soon sorting", desc: "Pools departing within 5 hours automatically rise to the top." },
          { icon: "🛡️", title: "Moderation", desc: "Report bad actors. Admins can suspend users and close reports." },
          { icon: "💸", title: "Split the cost", desc: "Set cost per person. No commission — money exchanged directly." },
        ].map((f) => (
          <div key={f.title} style={{ padding: "24px", border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ fontSize: "1rem", marginBottom: 6 }}>{f.title}</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.5, fontSize: "0.9rem", margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "var(--navy)", color: "white", padding: "60px 36px", textAlign: "center" }}>
        <h2 style={{ color: "white", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", marginBottom: 12 }}>
          Ready to carpool?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.05rem", marginBottom: 28 }}>
          Sign in with your Amrita email to get started.
        </p>
        <Link href="/login" className="btn-solid btn" style={{ background: "white", color: "var(--navy)", borderColor: "white", minHeight: 50, padding: "0 28px", fontSize: "1rem" }}>
          Sign in with college email →
        </Link>
      </section>

      <footer style={{ padding: "24px 48px", borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: "0.84rem", display: "flex", justifyContent: "space-between" }}>
        <span>© 2026 Commuto. Built for Amrita.</span>
        <span>Coimbatore Campus</span>
      </footer>
    </div>
  );
}
