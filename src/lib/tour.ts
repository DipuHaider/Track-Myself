export const TOUR_SCOPES = ["home", "portal", "dashboard"] as const;
export type TourScope = (typeof TOUR_SCOPES)[number];

export const TOUR_AUDIENCES = ["free", "premium", "admin"] as const;
export type TourAudience = (typeof TOUR_AUDIENCES)[number];

export const TOUR_EVENT = "tm-start-tour";
export const TOUR_PENDING_KEY = "tm-tour-pending";

export const TOUR_LABELS: Record<TourScope, string> = {
  home: "Homepage tour",
  portal: "Portal tour",
  dashboard: "Dashboard tour",
};

export const TOUR_DESCRIPTIONS: Record<TourScope, string> = {
  home: "Runs on the public homepage for a free account that has not seen it.",
  portal: "Runs on /me for a premium account that has not seen it.",
  dashboard: "Runs on the dashboard the first time an editor or admin signs in.",
};

/* Which audience each tour opens itself for. Anyone can still replay any of
   them from the quick bubble — this only governs the automatic first run. */
export const TOUR_AUTO_AUDIENCE: Record<TourScope, TourAudience> = {
  home: "free",
  portal: "premium",
  dashboard: "admin",
};

const DASHBOARD_PREFIXES = ["/dashboard", "/applications", "/analytics", "/users", "/settings"];

export function scopeForPath(pathname: string): TourScope | null {
  if (pathname === "/") return "home";
  if (pathname === "/me" || pathname.startsWith("/me/")) return "portal";
  if (DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "dashboard";
  }
  return null;
}

export type TourStep = {
  id: string;
  target: string;
  title: string;
  body: string;
};

const BUBBLE: TourStep = {
  id: "bubble",
  target: '[data-tour="bubble"]',
  title: "Your shortcut, anywhere",
  body: "Drag this to whichever edge suits you. It holds your to-dos, accessibility and display settings, a way to report an issue, and this tour.",
};

const HOME_STEPS: TourStep[] = [
  {
    id: "start",
    target: '[data-tour="hero-cta"]',
    title: "Start here",
    body: "Create a free account to track applications, or jump straight into the browser tools — those need no account at all.",
  },
  {
    id: "job-sites",
    target: "#job-sites",
    title: "Where the roles come from",
    body: "The platforms people actually apply through, grouped by country. Every application you log remembers which one it came from.",
  },
  {
    id: "cv-builder",
    target: "#cv-builder",
    title: "One profile, several CVs",
    body: "Fill your details once and export an ATS-friendly Word document free. Europass, Designer and cover letters come with Premium.",
  },
  {
    id: "tools",
    target: "#tools",
    title: "Six tools, nothing uploaded",
    body: "PDF editor and splitter, DOCX editor, background remover, banner and profile-image generators — all running in your browser.",
  },
  BUBBLE,
];

const PORTAL_BASE: TourStep[] = [
  {
    id: "pipeline",
    target: '[data-tour="pipeline"]',
    title: "Your pipeline at a glance",
    body: "Every application you track rolls up here — wishlist through offer. Click any tile to see which roles sit in that stage.",
  },
  {
    id: "recent",
    target: '[data-tour="recent"]',
    title: "Spot trouble early",
    body: "Your newest applications, flagged automatically. Ghost badges appear after 45 quiet days, and duplicates are caught when you apply to the same role twice.",
  },
  {
    id: "applications",
    target: '[data-tour="nav:/me/applications"]',
    title: "Add and manage roles",
    body: "The full table lives here — filter by status, platform or job type, log interview stages, and keep notes against each role.",
  },
  {
    id: "todos",
    target: '[data-tour="nav:/me/todos"]',
    title: "Keep the follow-ups",
    body: "A job hunt is lost in the follow-up. Keep chases here — on this page, or from the quick bubble on any screen.",
  },
];

const CV_FREE: TourStep = {
  id: "cv",
  target: '[data-tour="nav:/me/cv"]',
  title: "Build a CV that passes ATS",
  body: "Fill your details once and export a clean ATS-friendly Word document, free. Europass, Designer and cover-letter formats — plus AI tailoring to a job ad — unlock with Premium.",
};

const CV_PREMIUM: TourStep = {
  id: "cv",
  target: '[data-tour="nav:/me/cv"]',
  title: "Four formats from one profile",
  body: "Your details feed ATS, Europass and Designer layouts plus cover letters. Paste a job ad to have the summary and skill order tailored to it, and every generated document is kept so you can compare versions.",
};

const DOCS: TourStep = {
  id: "docs",
  target: '[data-tour="nav:/me/my-cv"]',
  title: "One home for your files",
  body: "Upload CVs, references and certificates. Mark one of each kind as primary and the builder will draw from it.",
};

const PORTAL_TOOLS: TourStep = {
  id: "tools",
  target: '[data-tour="nav:/tools"]',
  title: "Six tools, no upload",
  body: "PDF editor and splitter, DOCX editor, background remover, banner and profile-image generators. They run in your browser — your files never reach a server.",
};

const DASHBOARD_STEPS: TourStep[] = [
  {
    id: "dash-stats",
    target: '[data-tour="dash-stats"]',
    title: "The whole platform at a glance",
    body: "Totals across every account — applications logged, interviews reached, offers and rejections.",
  },
  {
    id: "all-applications",
    target: '[data-tour="nav:/applications"]',
    title: "Every user's applications",
    body: "The cross-account table. Editors can read it; changing or deleting another user's application needs the edit permission.",
  },
  {
    id: "analytics",
    target: '[data-tour="nav:/analytics"]',
    title: "Trends over time",
    body: "Funnel conversion, status distribution and platform performance across all tracked applications.",
  },
  {
    id: "users",
    target: '[data-tour="nav:/dashboard/users"]',
    title: "Accounts, roles and plans",
    body: "Promote or demote accounts, switch someone between free and premium, and pause an account without deleting it.",
  },
  {
    id: "issues",
    target: '[data-tour="nav:/dashboard/issues"]',
    title: "What users are reporting",
    body: "Every submitted issue with the page, viewport and browser attached. Each one is emailed too — the badge tells you whether that send succeeded.",
  },
  {
    id: "settings",
    target: '[data-tour="nav:/settings"]',
    title: "Configuration and feature flags",
    body: "Environment checks, data counts, maintenance tasks, and the switches that turn these tours on and off.",
  },
  BUBBLE,
];

export function stepsFor(scope: TourScope, premium: boolean): TourStep[] {
  if (scope === "home") return HOME_STEPS;
  if (scope === "dashboard") return DASHBOARD_STEPS;
  return [
    ...PORTAL_BASE,
    premium ? CV_PREMIUM : CV_FREE,
    ...(premium ? [DOCS] : []),
    PORTAL_TOOLS,
    BUBBLE,
  ];
}

export const TOUR_INTRO: Record<TourScope, string> = {
  home: "A quick look around, so nothing useful stays hidden.",
  portal: "A short pass over your workspace and what your plan unlocks.",
  dashboard: "A short pass over the admin side of TrackMyself.",
};
