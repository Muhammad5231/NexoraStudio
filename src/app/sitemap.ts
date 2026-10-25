import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  // The public site is a single-route application (hash-ranged views live on
  // one canonical URL); only the root is crawlable.
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();
  if (base) {
    entries.push({ url: base, lastModified: now, changeFrequency: "weekly", priority: 1 });
  }
  return entries;
}
