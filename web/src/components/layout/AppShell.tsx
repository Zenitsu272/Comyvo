"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Compass, PlusCircle, Car, Settings, ShieldAlert } from "lucide-react";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/my-pools", label: "My Pools", icon: Car },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldAlert, adminOnly: true },
];

interface User {
  full_name: string | null;
  roll_number: string | null;
  role: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (!response.ok) return;
      setUser(await response.json());
    };
    fetchUser();
  }, []);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  const initials = user?.full_name
    ? user.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <main className="app-shell">
        {/* ── Sidebar rail ── */}
        <aside className="rail">
          <Link className="brand" href="/discover" aria-label="Comyvo home">
            <span className="brand-mark">C</span>
            <span>
              <strong>Comyvo</strong>
              <small>Campus carpool</small>
            </span>
          </Link>

          <nav className="rail-nav" aria-label="App navigation">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-btn ${pathname.startsWith(item.href) ? "active" : ""}`}
                >
                  <span className="nav-icon" style={{ display: "inline-flex", background: "none" }}>
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="rail-footer">
            {user && (
              <Link className="rail-user" href="/settings" title="View settings">
                <span className="rail-user-avatar">{initials}</span>
                <div className="rail-user-info">
                  <strong>{user.full_name ?? "—"}</strong>
                  <small>{user.roll_number ?? "Complete profile"}</small>
                </div>
              </Link>
            )}
            <div className="rail-card">
              <span className="live-dot" />
              <strong>Live</strong>
              <p>Real data from Supabase.</p>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <section className="main-panel">{children}</section>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-inner">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-btn ${pathname.startsWith(item.href) ? "active" : ""}`}
              >
                <span className="mobile-nav-icon" style={{ display: "inline-flex", background: "none" }}>
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
