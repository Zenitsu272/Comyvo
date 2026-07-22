import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/layout.css";
import "@/styles/components.css";

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
