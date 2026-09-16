import type { NextConfig } from "next";

// On a serverless host (Vercel) that can't run yt-dlp itself, setting
// FULL_PIPELINE_HOST to a self-hosted deployment's URL (e.g. the Render one)
// transparently proxies just the Collection-import routes there — the
// browser stays on this domain the whole time, only these two requests
// actually get handled by the other host. Requires AUTH_SECRET to match on
// both hosts, since the proxied request carries this domain's session
// cookie and the other host verifies it itself.
const FULL_PIPELINE_HOST = process.env.FULL_PIPELINE_HOST?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!FULL_PIPELINE_HOST) return [];
    return [
      { source: "/api/collections/:path*", destination: `${FULL_PIPELINE_HOST}/api/collections/:path*` },
    ];
  },
};

export default nextConfig;
