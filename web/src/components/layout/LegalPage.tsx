import Link from "next/link";

export default function LegalPage({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 20px 72px" }}>
      <article style={{ width: "min(760px, 100%)", margin: "0 auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 20, padding: "clamp(24px, 5vw, 52px)", boxShadow: "var(--shadow-sm)" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 32 }}>
          <span className="brand-mark" style={{ width: 36, height: 36, fontSize: "0.9rem" }}>C</span>
          <strong>Comyvo</strong>
        </Link>
        <p className="kicker">Effective 26 September 2026</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", marginBottom: 12 }}>{title}</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 32 }}>{summary}</p>
        <div className="legal-content">{children}</div>
      </article>
    </main>
  );
}
