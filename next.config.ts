import type { NextConfig } from "next";

// Allow Node.js to connect to Google OAuth through corporate SSL-inspection proxies in dev
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const EXT_CORS = [
  { key: "Access-Control-Allow-Origin",  value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/api/extension/:path*", headers: EXT_CORS }];
  },
  serverExternalPackages: ["mongoose", "bcryptjs"],
  typescript: { ignoreBuildErrors: true },
  // eslint: { ignoreDuringBuilds: true }, // uncomment if tsc check crashes on Windows
  experimental: {
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 25,
  },
};

export default nextConfig;
