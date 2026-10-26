import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/content";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// /manifest.webmanifest — PWA identity from the admin brand settings.
// ---------------------------------------------------------------------------

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const brand = settings.brand.name || "Nexora Studio";

  return {
    name: brand,
    short_name: brand.split(/\s+/)[0] || "Nexora",
    description: settings.seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
