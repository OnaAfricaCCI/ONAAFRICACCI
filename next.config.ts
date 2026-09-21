import type { NextConfig } from "next";

const CANONICAL_HOST = "onafunds.com";

// Every other hostname the site answers on is sent to the canonical one, so
// there is exactly one address in links, search results and analytics.
// (ona-africa-cci.vercel.app joins this list once onafunds.com is resolving,
//  so the old address never redirects into a domain that isn't live yet.)
const ALIASES = ["www.onafunds.com", "onafunds.org", "www.onafunds.org"];

const nextConfig: NextConfig = {
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
