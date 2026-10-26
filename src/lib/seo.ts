import "server-only";
import { getSettings } from "@/lib/content";

// ---------------------------------------------------------------------------
// Server-side SEO helpers shared by the metadata routes
// (layout / sitemap / robots / manifest).
// ---------------------------------------------------------------------------

/** Resolve the canonical public origin: admin setting → env → localhost. */
export async function getSiteUrl(): Promise<string> {
  const settings = await getSettings();
  const raw = (settings.seo.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, "");
}

/** Absolute URL for a possibly-relative media reference (e.g. /uploads/…). */
export function absoluteUrl(ref: string, base: string): string {
  if (!ref) return "";
  if (/^https?:\/\//i.test(ref)) return ref;
  return `${base}${ref.startsWith("/") ? "" : "/"}${ref}`;
}
