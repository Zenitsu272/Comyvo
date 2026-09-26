import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import ToastContainer from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Discover Rides",
  description: "Browse verified campus carpool pools sorted by departure time and trust score.",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users")
    .select("full_name,roll_number,department,campus")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.full_name || !profile.roll_number || !profile.department || !profile.campus) {
    redirect("/signup");
  }
  return (
    <>
      <AppShell>{children}</AppShell>
      <ToastContainer />
    </>
  );
}
