import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// /sitemap.xml — the public site is a single canonical URL; hash-routed views
// (work, services, gallery…) live on that one address and are indexed as one
// document. The URL follows Admin → Settings → SEO → Site URL once it is set.
// ---------------------------------------------------------------------------

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const now = new Date();
  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
