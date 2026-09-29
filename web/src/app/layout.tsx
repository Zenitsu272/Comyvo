import type { Metadata } from "next";
import { isTemporaryLoginEnabled } from "@/lib/login-mode";
import "@/styles/globals.css";
import "@/styles/layout.css";
import "@/styles/components.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"),
  title: {
    default: "Comyvo — Campus Carpool",
    template: "%s | Comyvo",
  },
  description:
    "Verified campus carpool for Amrita students. Find or create ride pools to Coimbatore railway station, airport, and beyond.",
  keywords: ["carpool", "campus", "amrita", "coimbatore", "ride pool", "comyvo"],
  manifest: "/manifest.json",
  openGraph: {
    title: "Comyvo — Campus Carpool",
    description: "Verified campus carpool for Amrita students.",
    type: "website",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {isTemporaryLoginEnabled() && <aside role="status" style={{ background: "#fff3cd", color: "#664d03", padding: "10px 16px", textAlign: "center", fontSize: 14 }}>Temporary demo mode: email identities are not verified. Do not share sensitive information.</aside>}
        {children}
      </body>
    </html>
  );
}
