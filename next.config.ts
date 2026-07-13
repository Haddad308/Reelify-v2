import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Dev-only: api.reelify.cc sends no CORS headers, so the browser can't
    // call it directly from localhost. Proxying through the Next.js dev
    // server keeps the request same-origin (server-to-server calls aren't
    // subject to CORS). Not needed in production, where the app is presumably
    // served from an origin the API already allows.
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/reelify/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE}/:path*`,
      },
    ];
  },
};

export default nextConfig;
