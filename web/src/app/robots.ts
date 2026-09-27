import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/settings", "/my-pools", "/create", "/pool/", "/signup"] },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"}/sitemap.xml`,
  };
}
