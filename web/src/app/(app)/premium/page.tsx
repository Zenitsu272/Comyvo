"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { PhoneCall, Star, ShieldCheck, Crown } from "lucide-react";

export default function PremiumPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [profile, setProfile] = useState<{ role: string; full_name: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [supabase, router]);

  const handleUpgrade = async () => {
    if (!profile) return;
    setRequesting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({ role: "premium" })
      .eq("id", user.id);

    setRequesting(false);

    if (error) {
      toast("Upgrade request failed.", "error");
      return;
    }

    toast("Congratulations! You are now a Premium Member! 🎉", "success");
    setProfile((prev) => prev ? { ...prev, role: "premium" } : null);
  };

  if (loading) {
    return (
      <>
        <header className="topbar"><div className="title-block"><Skeleton height={32} width={180} /></div></header>
        <div className="screen-content"><Skeleton height={300} /></div>
      </>
    );
  }

  if (!profile) return null;

  return (
    <>
      <header className="topbar">
        <div className="title-block">
          <p className="kicker">Membership tier</p>
          <h1>Premium access</h1>
        </div>
      </header>

      <div className="screen-content">
        <div className="pool-detail-layout" style={{ maxWidth: 840, margin: "0 auto" }}>
          <div className="pool-detail-card" style={{ padding: 40, textAlign: "center" }}>
            <p className="kicker" style={{ fontSize: "0.85rem", marginBottom: 12 }}>Commuto Club</p>
            <h2 style={{ fontSize: "2.4rem", letterSpacing: "-0.03em" }}>Unlock full contact access</h2>
            <p className="helper" style={{ maxWidth: 480, margin: "0 auto 30px", fontSize: "1.05rem" }}>
              Get instant, early phone number visibility on any pool without needing to join it first.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
              marginBottom: 36,
              textAlign: "left"
            }}>
              {[
                { icon: PhoneCall, title: "Early Phone View", desc: "Instantly call any host to coordinate timings before booking a seat." },
                { icon: Star, title: "Priority Support", desc: "Get priority moderation reviews for safety reports." },
                { icon: ShieldCheck, title: "Premium Badge", desc: "A sleek premium badge on your profile to verify your reliability." }
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} style={{ padding: 20, border: "1.5px solid var(--line)", borderRadius: 14, background: "var(--panel-soft)" }}>
                    <div style={{ color: "var(--teal)", marginBottom: 10, display: "inline-flex" }}>
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem" }}>{p.title}</h4>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>{p.desc}</p>
                  </div>
                );
              })}
            </div>

            {profile.role === "premium" ? (
              <div style={{ padding: "16px 24px", borderRadius: 12, background: "var(--teal-weak)", border: "1.5px solid rgba(11, 143, 111, 0.22)", display: "inline-flex", gap: 10, alignItems: "center" }}>
                <Crown size={20} style={{ color: "var(--amber)" }} />
                <span style={{ color: "var(--teal)", fontWeight: 700 }}>You are an active Premium Member</span>
              </div>
            ) : profile.role === "admin" ? (
              <span className="badge badge-neutral">Admin Tier</span>
            ) : (
              <button
                type="button"
                className="btn-solid btn btn-lg"
                style={{ background: "var(--teal)", borderColor: "var(--teal)", minWidth: 240 }}
                onClick={handleUpgrade}
                disabled={requesting}
              >
                Unlock Premium (Dev Mode Free)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
