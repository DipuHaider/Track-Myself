export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://track-myself.vercel.app";

export const SITE_NAME = "TrackMyself";

export const SITE_TAGLINE =
  "Know exactly where every application stands";

export const SITE_DESCRIPTION =
  "Track every job application through ten pipeline stages, catch ghost listings and duplicates automatically, and export ATS, Europass and Designer CVs as real Word documents. Free browser tools for headshots, banners and PDFs — no upload required.";

export const PUBLIC_ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/tools", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/tools/bg-remover", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/tools/profile-image", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/tools/banner-generator", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/tools/jd-analyzer", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/tools/image-optimizer", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/tools/pdf-splitter", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/register", priority: 0.6, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
];

export const NOINDEX = {
  robots: { index: false, follow: false },
} as const;
