import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/content";
import { getSiteUrl, absoluteUrl } from "@/lib/seo";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// ---------------------------------------------------------------------------
// Dynamic metadata — every title/description/keyword/OG field is driven by
// Admin → Settings → SEO, so the owner controls search appearance from the
// panel without touching code.
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const base = await getSiteUrl();
  const brand = settings.brand.name || "Nexora Studio";
  const title = settings.seo.title || `${brand} — Websites & Video Content`;
  const description = settings.seo.description;
  const keywords = settings.seo.keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const ogImageRef = settings.seo.ogImage || settings.home.heroMediaMain;
  const ogImages = ogImageRef
    ? [{ url: absoluteUrl(ogImageRef, base), width: 1200, height: 630, alt: brand }]
    : undefined;

  return {
    metadataBase: new URL(base),
    title: {
      default: title,
      template: `%s · ${brand}`,
    },
    description,
    keywords,
    applicationName: brand,
    alternates: { canonical: "/" },
    icons: { icon: "/favicon.svg" },
    manifest: "/manifest.webmanifest",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      url: "/",
      siteName: brand,
      title,
      description,
      locale: "en_IN",
      images: ogImages,
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages ? ogImages.map((i) => i.url) : undefined,
    },
    verification: settings.seo.googleSiteVerification
      ? { google: settings.seo.googleSiteVerification }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        // Dark page background (public theme + overscroll colour), but the
        // inherited TEXT colour stays the neutral foreground token: the admin
        // panel and portaled dialogs/sheets/selects render on light surfaces
        // and must never inherit the site's ivory text. The public site
        // re-declares `text-ivory` on its own dark wrapper (site-shell.tsx).
        className={`${spaceGrotesk.variable} ${inter.variable} antialiased bg-ink text-foreground`}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#161618",
              color: "#f2efe7",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
      </body>
    </html>
  );
}
