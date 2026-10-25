import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

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

export const metadata: Metadata = {
  title: {
    default: "Nexora Studio — Websites & Video Content for Growing Businesses",
    template: "%s · Nexora Studio",
  },
  description:
    "Independent creative studio building distinctive websites and short-form video content for small businesses, institutes and creators across India.",
  keywords: [
    "web design india",
    "freelance web developer",
    "video editing",
    "reels editing",
    "landing pages",
    "creative studio",
  ],
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

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
