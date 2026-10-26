import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// /robots.txt — the admin panel is a hash route (physically "/"), so it is
// blocked from the index at render time via the robots meta tag instead.
// The API surface is disallowed here.
// ---------------------------------------------------------------------------

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
