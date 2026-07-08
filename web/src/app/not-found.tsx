import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", textAlign: "center", padding: 36 }}>
      <div className="brand-mark" style={{ width: 56, height: 56, fontSize: "1.4rem", marginBottom: 24 }}>C</div>
      <p className="kicker">Error 404</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: 12 }}>Page not found</h1>
      <p style={{ color: "var(--muted)", fontSize: "1.05rem", marginBottom: 28 }}>
        This page doesn&apos;t exist. Maybe you followed a broken link?
      </p>
      <Link href="/discover" className="btn-solid btn">Back to Discover</Link>
    </div>
  );
}
