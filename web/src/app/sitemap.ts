import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  return [
    { url: baseUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/signup`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
