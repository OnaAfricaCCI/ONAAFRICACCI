import type { NextConfig } from "next";

const CANONICAL_HOST = "onafunds.com";

// Every other hostname the site answers on is sent to the canonical one, so
// there is exactly one address in links, search results and analytics.
// (ona-africa-cci.vercel.app joins this list once onafunds.com is resolving,
//  so the old address never redirects into a domain that isn't live yet.)
const ALIASES = ["www.onafunds.com", "onafunds.org", "www.onafunds.org"];

/**
 * Content Security Policy: the allow-list of where the browser may load
 * things from. Anything not listed is blocked, which defeats injected
 * scripts even if one somehow reached the page.
 *
 * 'unsafe-inline' for scripts is needed by the theme-init and JSON-LD
 * snippets; the policy still blocks every external origin not named here.
 */
const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' only in development: React's dev tooling needs it; production never does.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://eu.i.posthog.com https://eu-assets.i.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com",
  "frame-src https://www.youtube.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // Never let the site be embedded in someone else's page (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Browsers must trust the declared file type, not guess
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Outbound links get the page origin only, not full URLs
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site never needs these device capabilities
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Two years of forced https, including subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise the framework

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  async redirects() {
    return ALIASES.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `https://${CANONICAL_HOST}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;
