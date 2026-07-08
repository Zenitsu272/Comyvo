import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import ToastContainer from "@/components/ui/Toast";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Discover Rides",
  description: "Browse verified campus carpool pools sorted by departure time and trust score.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <ToastContainer />
    </>
  );
}
