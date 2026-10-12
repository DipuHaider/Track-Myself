import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

/* Corporate TLS-inspection proxies break Google OAuth and the model APIs in
   development. Verification is switched off only when the developer asks for it
   explicitly and never in production, and the choice is printed so it is never
   a silent surprise. */
if (process.env.NODE_ENV !== "production" && process.env.DEV_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("[next.config] DEV_INSECURE_TLS=1: TLS certificate verification is disabled for this dev process.");
}

const DEV = process.env.NODE_ENV !== "production";

/* Only the browser tools run WebAssembly (Transformers.js for background
   removal), so eval is granted to /tools alone; the rest of the site gets a CSP
   without it. React Refresh needs eval in development. */
function scriptSrc(extra: string[] = []) {
  return ["'self'", "'unsafe-inline'", "blob:", ...(DEV ? ["'unsafe-eval'"] : []), ...extra].join(" ");
}

function csp(script: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    `script-src ${script}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' blob: data: https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://*.hf.co",
    "media-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp(scriptSrc()) },
];

const TOOLS_HEADERS = [
  ...SECURITY_HEADERS.filter((h) => h.key !== "Content-Security-Policy"),
  { key: "Content-Security-Policy", value: csp(scriptSrc(["'wasm-unsafe-eval'"])) },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/admin/:path*", destination: "/dashboard", permanent: false }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/tools/:path*", headers: TOOLS_HEADERS },
    ];
  },
  serverExternalPackages: ["mongoose", "bcryptjs", "@react-pdf/renderer", "unpdf", "word-extractor"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  // eslint: { ignoreDuringBuilds: true }, // uncomment if tsc check crashes on Windows
  experimental: {
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 25,
  },
};

/* Source maps upload only when SENTRY_AUTH_TOKEN is present (Vercel env), so
   CI and local builds stay token-free and the plugin just warns. The tunnel
   route keeps browser reports same-origin, which the CSP connect-src already
   allows. */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  widenClientFileUpload: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  telemetry: false,
});
