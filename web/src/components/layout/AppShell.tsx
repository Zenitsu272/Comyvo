"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: "D" },
  { href: "/create", label: "Create", icon: "C" },
  { href: "/my-pools", label: "My Pools", icon: "M" },
  { href: "/admin", label: "Admin", icon: "A", adminOnly: true },
];

interface User {
  full_name: string | null;
  roll_number: string | null;
  role: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from("users")
        .select("full_name, roll_number, role")
        .eq("id", authUser.id)
        .single();
      setUser(data);
    };
    fetchUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
          <Link className="brand" href="/discover" aria-label="Commuto home">
            <span className="brand-mark">C</span>
            <span>
              <strong>Commuto</strong>
              <small>Campus carpool</small>
            </span>
          </Link>

          <nav className="rail-nav" aria-label="App navigation">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-btn ${pathname.startsWith(item.href) ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="rail-footer">
            {user && (
              <button className="rail-user" onClick={handleSignOut} title="Sign out">
                <span className="rail-user-avatar">{initials}</span>
                <div className="rail-user-info">
                  <strong>{user.full_name ?? "—"}</strong>
                  <small>{user.roll_number ?? "Complete profile"}</small>
                </div>
              </button>
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
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-btn ${pathname.startsWith(item.href) ? "active" : ""}`}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
