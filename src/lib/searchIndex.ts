import type { DashboardAction } from "@/lib/permissions";

export type SearchVisibility =
  | { type: "public" }
  | { type: "guest" }
  | { type: "auth" }
  | { type: "action"; action: DashboardAction }
  | { type: "admin" };

export type SearchGroupKey =
  | "pages"
  | "tools"
  | "portal"
  | "dashboard"
  | "applications"
  | "documents"
  | "users";

export type SearchPage = {
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
  group: SearchGroupKey;
  visibility: SearchVisibility;
};

export const GROUP_LABELS: Record<SearchGroupKey, string> = {
  pages: "Site",
  tools: "Tools",
  portal: "My account",
  dashboard: "Dashboard",
  applications: "Applications",
  documents: "My documents",
  users: "Users",
};

export const GROUP_ORDER: SearchGroupKey[] = [
  "applications", "documents", "users", "portal", "dashboard", "tools", "pages",
];

export const SEARCH_PAGES: SearchPage[] = [
  {
    title: "Home", subtitle: "TrackMyself landing page", href: "/",
    keywords: ["home", "start", "landing", "front"],
    group: "pages", visibility: { type: "public" },
  },
  {
    title: "Trending Jobs", subtitle: "What people are applying to right now", href: "/#trending",
    keywords: ["trending", "popular", "hot", "jobs"],
    group: "pages", visibility: { type: "public" },
  },
  {
    title: "Job Sites", subtitle: "Where to find roles worth applying to", href: "/#job-sites",
    keywords: ["job", "boards", "sites", "linkedin", "indeed", "portals"],
    group: "pages", visibility: { type: "public" },
  },
  {
    title: "Free CV Builder", subtitle: "Build a Word CV without an account", href: "/#cv-builder",
    keywords: ["cv", "resume", "builder", "word", "docx", "ats", "europass", "designer", "free"],
    group: "pages", visibility: { type: "public" },
  },
  {
    title: "Get Started", subtitle: "Create your tracker", href: "/#cta",
    keywords: ["get started", "signup", "join", "cta"],
    group: "pages", visibility: { type: "public" },
  },

  {
    title: "All Tools", subtitle: "Free job-hunting utilities", href: "/tools",
    keywords: ["tools", "utilities", "free"],
    group: "tools", visibility: { type: "public" },
  },
  {
    title: "JD Analyzer", subtitle: "Break down a job description", href: "/tools/jd-analyzer",
    keywords: ["tool", "tools", "jd", "job description", "analyse", "analyze", "keywords", "match"],
    group: "tools", visibility: { type: "public" },
  },
  {
    title: "Background Remover", subtitle: "Cut out the background with on-device AI", href: "/tools/bg-remover",
    keywords: ["tool", "tools", "background", "remove", "bg", "cutout", "transparent", "png", "eraser", "remover"],
    group: "tools", visibility: { type: "public" },
  },
  {
    title: "Profile Image Generator", subtitle: "Headshots for LinkedIn, GitHub and your CV", href: "/tools/profile-image",
    keywords: ["tool", "tools", "profile", "picture", "avatar", "headshot", "photo", "linkedin", "github", "crop", "circle", "passport"],
    group: "tools", visibility: { type: "public" },
  },
  {
    title: "Banner Generator & Resizer", subtitle: "Profile banners at LinkedIn, GitHub and X sizes", href: "/tools/banner-generator",
    keywords: ["tool", "tools", "banner", "cover", "header", "linkedin", "github", "twitter", "x", "resize", "resizer", "social", "generator"],
    group: "tools", visibility: { type: "public" },
  },
  {
    title: "Image Optimizer", subtitle: "Compress and resize images", href: "/tools/image-optimizer",
    keywords: ["tool", "tools", "image", "photo", "compress", "resize", "optimise", "optimize"],
    group: "tools", visibility: { type: "public" },
  },
  {
    title: "PDF Splitter", subtitle: "Split and extract PDF pages", href: "/tools/pdf-splitter",
    keywords: ["tool", "tools", "pdf", "split", "merge", "pages", "extract"],
    group: "tools", visibility: { type: "public" },
  },

  {
    title: "FAQ", subtitle: "Answers about tracking, CVs, tools, Premium and privacy", href: "/faq",
    keywords: ["faq", "help", "support", "question", "answers", "how", "troubleshoot", "problem"],
    group: "pages", visibility: { type: "public" },
  },
  {
    title: "Terms & Conditions", subtitle: "The agreement covering your use of TrackMyself", href: "/terms",
    keywords: ["terms", "conditions", "legal", "agreement", "tos", "acceptable use"],
    group: "pages", visibility: { type: "public" },
  },
  {
    title: "Privacy Policy", subtitle: "What we collect, why, and how to delete it", href: "/privacy",
    keywords: ["privacy", "policy", "gdpr", "data", "cookies", "delete", "legal"],
    group: "pages", visibility: { type: "public" },
  },
  {
    title: "Login", subtitle: "Sign in to your account", href: "/login",
    keywords: ["login", "sign in", "signin"],
    group: "pages", visibility: { type: "guest" },
  },
  {
    title: "Register", subtitle: "Create a free account", href: "/register",
    keywords: ["register", "sign up", "signup", "create account"],
    group: "pages", visibility: { type: "guest" },
  },

  {
    title: "My Overview", subtitle: "Your stats, profile and password", href: "/me",
    keywords: ["overview", "profile", "me", "account", "password", "stats", "dashboard"],
    group: "portal", visibility: { type: "auth" },
  },
  {
    title: "My Applications", subtitle: "Everything you have applied to", href: "/me/applications",
    keywords: ["my applications", "applied", "tracker", "jobs", "wishlist"],
    group: "portal", visibility: { type: "auth" },
  },
  {
    title: "My Documents", subtitle: "CV, resume, cover letters, photo", href: "/me/my-cv",
    keywords: ["documents", "files", "cv", "resume", "cover letter", "photo", "upload", "certificate"],
    group: "portal", visibility: { type: "auth" },
  },
  {
    title: "CV Builder", subtitle: "ATS, Europass and Designer Word CVs", href: "/me/cv",
    keywords: ["cv", "builder", "ats", "europass", "designer", "lebenslauf", "docx", "word", "tailor"],
    group: "portal", visibility: { type: "auth" },
  },

  {
    title: "Dashboard", subtitle: "Platform overview", href: "/dashboard",
    keywords: ["dashboard", "admin", "overview", "monitor"],
    group: "dashboard", visibility: { type: "action", action: "view:applications" },
  },
  {
    title: "All Applications", subtitle: "Every application across all users", href: "/applications",
    keywords: ["all applications", "everyone", "monitor", "moderate"],
    group: "dashboard", visibility: { type: "action", action: "view:applications" },
  },
  {
    title: "Analytics", subtitle: "Trends, funnel and sourcing", href: "/analytics",
    keywords: ["analytics", "charts", "funnel", "trend", "reports", "metrics"],
    group: "dashboard", visibility: { type: "action", action: "view:analytics" },
  },
  {
    title: "CV Overview", subtitle: "CV adoption and storage per user", href: "/dashboard/cv",
    keywords: ["cv overview", "adoption", "storage", "documents"],
    group: "dashboard", visibility: { type: "action", action: "view:cv" },
  },
  {
    title: "Users", subtitle: "Roles, plans and accounts", href: "/dashboard/users",
    keywords: ["users", "accounts", "roles", "plan", "premium", "members"],
    group: "dashboard", visibility: { type: "action", action: "view:users" },
  },
  {
    title: "Settings", subtitle: "Configuration and maintenance", href: "/settings",
    keywords: ["settings", "configuration", "migration", "maintenance", "system"],
    group: "dashboard", visibility: { type: "action", action: "view:settings" },
  },
  {
    title: "Access Control", subtitle: "Role permission matrix", href: "/dashboard/rbac",
    keywords: ["access", "rbac", "permissions", "roles", "matrix", "security"],
    group: "dashboard", visibility: { type: "admin" },
  },
];

export function pageMatches(page: SearchPage, q: string) {
  const haystack = [page.title, page.subtitle, ...page.keywords].join(" ").toLowerCase();
  return haystack.includes(q);
}
