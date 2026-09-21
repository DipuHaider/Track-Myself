export const TOUR_VARIANTS = ["free", "premium"] as const;
export type TourVariant = (typeof TOUR_VARIANTS)[number];

export const TOUR_EVENT = "tm-start-tour";
export const TOUR_PENDING_KEY = "tm-tour-pending";

export type TourStep = {
  id: string;
  target: string;
  title: string;
  body: string;
  optional?: boolean;
};

const PIPELINE: TourStep = {
  id: "pipeline",
  target: '[data-tour="pipeline"]',
  title: "Your pipeline at a glance",
  body: "Every application you track rolls up here — wishlist through offer. Click any tile to see exactly which roles sit in that stage.",
};

const RECENT: TourStep = {
  id: "recent",
  target: '[data-tour="recent"]',
  title: "Spot trouble early",
  body: "Your newest applications, flagged automatically. Ghost badges appear after 45 quiet days, and duplicates are caught when you apply to the same role twice.",
};

const APPLICATIONS: TourStep = {
  id: "applications",
  target: '[data-tour="nav:/me/applications"]',
  title: "Add and manage roles",
  body: "The full table lives here — filter by status, platform or job type, log interview stages, and keep notes against each role.",
};

const TODOS: TourStep = {
  id: "todos",
  target: '[data-tour="todos"]',
  title: "Keep the follow-ups",
  body: "A job hunt is lost in the follow-up. Anything you jot here stays with your account, so the next chase is never a memory test.",
};

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

const TOOLS: TourStep = {
  id: "tools",
  target: '[data-tour="nav:/tools"]',
  title: "Six tools, no upload",
  body: "PDF editor and splitter, DOCX editor, background remover, banner and profile-image generators. They run in your browser — your files never reach a server.",
};

const BUBBLE: TourStep = {
  id: "bubble",
  target: '[data-tour="bubble"]',
  title: "Your shortcut, anywhere",
  body: "Drag this to whichever edge suits you. It holds your to-dos, accessibility and display settings, a way to report an issue, and a jump back to the top.",
};

export const TOUR_STEPS: Record<TourVariant, TourStep[]> = {
  free: [PIPELINE, RECENT, APPLICATIONS, TODOS, CV_FREE, TOOLS, BUBBLE],
  premium: [PIPELINE, RECENT, APPLICATIONS, TODOS, CV_PREMIUM, DOCS, TOOLS, BUBBLE],
};

export const TOUR_INTRO: Record<TourVariant, { title: string; body: string }> = {
  free: {
    title: "Welcome to TrackMyself",
    body: "A two-minute look at the essentials, so nothing useful stays hidden.",
  },
  premium: {
    title: "Welcome — you're on Premium",
    body: "A quick pass over the essentials, including what your plan unlocks.",
  },
};
