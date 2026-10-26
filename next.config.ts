import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Security headers applied to every response. Deliberately conservative:
// - No X-Frame-Options / frame-ancestors lock-down, so the sandbox preview
//   panel (which frames the site) keeps working. Add CSP/frame-ancestors on
//   your own domain after launch if you want clickjacking hardening.
// - /api responses are always no-store so private admin data is never cached
//   by browsers or shared proxies.
// ---------------------------------------------------------------------------

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Don't advertise the framework version.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
