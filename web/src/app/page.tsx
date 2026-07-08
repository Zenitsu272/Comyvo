import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, EyeOff, Users, Zap, AlertOctagon, CirclePercent, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Commuto — Verified Campus Carpool for Amrita Students",
  description:
    "Find or host carpools with verified Amrita students. Safe, affordable rides to Coimbatore railway station, airport, and beyond.",
};

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* ── Navbar ── */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 48px",
        borderBottom: "1.5px solid var(--line)",
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div className="brand" style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span className="brand-mark" style={{ width: 38, height: 38, fontSize: "0.95rem" }}>C</span>
          <span style={{ textAlign: "left" }}>
            <strong style={{ display: "block", fontSize: "0.95rem" }}>Commuto</strong>
            <small style={{ display: "block", color: "var(--muted)", fontSize: "0.72rem" }}>Campus carpool</small>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" className="btn-ghost btn btn-sm">Sign in</Link>
          <Link href="/login" className="btn-solid btn btn-sm" style={{ background: "var(--teal)", borderColor: "var(--teal)" }}>Get started</Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        maxWidth: 1120,
        width: "100%",
        margin: "0 auto",
        padding: "90px 24px 70px",
        textAlign: "center",
      }}>
        <div style={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "300px",
          background: "radial-gradient(circle, rgba(14, 168, 127, 0.1) 0%, rgba(246, 246, 243, 0) 70%)",
          filter: "blur(60px)",
          zIndex: -1
        }} />

        <p className="kicker" style={{ fontSize: "0.8rem", marginBottom: 12 }}>Amrita verified network</p>
        <h1 style={{
          fontSize: "clamp(2.5rem, 6vw, 4.4rem)",
          letterSpacing: "-0.04em",
          lineHeight: 1.06,
          marginBottom: 24,
          fontWeight: 800
        }}>
          Share rides, split costs.<br />
          <span style={{ color: "var(--teal)" }}>Purely for Amrita.</span>
        </h1>
        <p style={{
          fontSize: "1.24rem",
          color: "var(--muted)",
          maxWidth: 620,
          margin: "0 auto 40px",
          lineHeight: 1.6,
          fontWeight: 500
        }}>
          Connect with verified students on campus. Safe, reliable carpools to Coimbatore Junction, Airport, or anywhere nearby.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" className="btn-solid btn btn-lg" style={{ background: "var(--navy)", borderColor: "var(--navy)", minWidth: 180, display: "inline-flex", gap: 8, alignItems: "center" }}>
            Find a ride
            <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-ghost btn btn-lg" style={{ minWidth: 180 }}>
            Host a carpool
          </Link>
        </div>
      </section>

      {/* ── Steps: How it Works ── */}
      <section style={{
        maxWidth: 1120,
        width: "100%",
        margin: "0 auto 80px",
        padding: "0 24px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <p className="kicker">Process</p>
          <h2 style={{ fontSize: "2rem" }}>How Commuto works</h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24
        }}>
          {[
            { step: "01", title: "Authenticate", desc: "Sign in with your Amrita student email. Your details are decoded and profile is prefilled instantly." },
            { step: "02", title: "Search or Host", desc: "Discover active rides sorted by departure time, or create a pool with settings like women-only or phone privacy." },
            { step: "03", title: "Join & Ride", desc: "Secure a seat. Host phone details unlock automatically for members. Split the cost directly." }
          ].map((item) => (
            <div key={item.step} style={{
              background: "var(--panel)",
              border: "1.5px solid var(--line)",
              borderRadius: 20,
              padding: 32,
              boxShadow: "var(--shadow-sm)"
            }}>
              <span style={{
                display: "inline-block",
                color: "var(--teal)",
                fontFamily: "monospace",
                fontWeight: 800,
                fontSize: "1.3rem",
                marginBottom: 16
              }}>{item.step}</span>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 10 }}>{item.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section style={{
        maxWidth: 1120,
        width: "100%",
        margin: "0 auto 80px",
        padding: "0 24px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <p className="kicker">Features</p>
          <h2 style={{ fontSize: "2rem" }}>Built with student safety in mind</h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20
        }}>
          {[
            { icon: ShieldCheck, title: "Amrita Domain Whitelist", desc: "Only @students.amrita.edu and @amrita.edu addresses can enter. Guaranteed peers." },
            { icon: EyeOff, title: "Phone Masking", desc: "Your contact details are protected and only shown to approved co-riders." },
            { icon: Users, title: "Women-Only Option", desc: "Female hosts can restrict pool visibility to women students for extra security." },
            { icon: Zap, title: "Urgent Priority Sorting", desc: "Pools leaving within 5 hours rise to the top automatically so you find last-minute rides." },
            { icon: AlertOctagon, title: "Safety Moderation", desc: "Easily report bad behavior. Admins review reports and suspend bad actors instantly." },
            { icon: CirclePercent, title: "Zero Commission", desc: "Commuto is free. Split exact cab fares directly with peers without middleman fees." }
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} style={{
                padding: 28,
                border: "1.5px solid var(--line)",
                borderRadius: 16,
                background: "var(--panel)",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ color: "var(--teal)", marginBottom: 14, display: "inline-flex" }}>
                  <Icon size={28} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.55, fontSize: "0.88rem", margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        marginTop: "auto",
        padding: "36px 48px",
        borderTop: "1.5px solid var(--line)",
        color: "var(--muted)",
        fontSize: "0.88rem",
        display: "flex",
        justifyContent: "space-between",
        background: "rgba(255, 255, 255, 0.4)",
        flexWrap: "wrap",
        gap: 16
      }}>
        <span>© 2026 Commuto. Created for Amrita Vishwa Vidyapeetham.</span>
        <span>Coimbatore Campus</span>
      </footer>
    </div>
  );
}
