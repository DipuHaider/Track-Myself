export const TARGET_PLATFORMS = ["linkedin", "xing", "stepstone", "other"] as const;
export type TargetPlatform = (typeof TARGET_PLATFORMS)[number];

export const WEBHOOK_EVENTS = ["lead.created", "lead.ready", "application.submitted", "report.daily"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type ScreeningAnswer = { question: string; answer: string };

export type ApplicantFacts = {
  phone: string;
  city: string;
  salaryExpectation: string;
  noticePeriod: string;
  workPermit: string;
  startDate: string;
  linkedinUrl: string;
  websiteUrl: string;
};

export type WebhookSettings = {
  url: string;
  events: WebhookEvent[];
  sealed: { ciphertext: string; iv: string; tag: string } | null;
  last4: string;
  lastStatus: string;
  lastAt: string | null;
};

export type JobHuntSettings = {
  enabled: boolean;
  dailyTargets: Record<TargetPlatform, number>;
  autoPrepareTop: number;
  minFitForAutoPrepare: number;
  reportEmail: boolean;
  applicant: ApplicantFacts;
  screeningAnswers: ScreeningAnswer[];
  webhook: WebhookSettings;
};

export const SCREENING_MAX = 50;
export const TARGET_MAX = 50;
export const AUTO_PREPARE_MAX = 10;

const APPLICANT_KEYS: (keyof ApplicantFacts)[] = [
  "phone", "city", "salaryExpectation", "noticePeriod", "workPermit", "startDate", "linkedinUrl", "websiteUrl",
];

export const JOB_HUNT_DEFAULTS: JobHuntSettings = {
  enabled: false,
  dailyTargets: { linkedin: 5, xing: 5, stepstone: 8, other: 0 },
  autoPrepareTop: 0,
  minFitForAutoPrepare: 50,
  reportEmail: true,
  applicant: {
    phone: "", city: "", salaryExpectation: "", noticePeriod: "", workPermit: "", startDate: "",
    linkedinUrl: "", websiteUrl: "",
  },
  screeningAnswers: [],
  webhook: { url: "", events: [], sealed: null, last4: "", lastStatus: "", lastAt: null },
};

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function int(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sealedFrom(v: unknown): WebhookSettings["sealed"] {
  const s = v as Partial<{ ciphertext: string; iv: string; tag: string }> | null | undefined;
  if (!s || typeof s.ciphertext !== "string" || typeof s.iv !== "string" || typeof s.tag !== "string") return null;
  return { ciphertext: s.ciphertext, iv: s.iv, tag: s.tag };
}

export function normaliseJobHunt(raw: unknown): JobHuntSettings {
  const v = (raw ?? {}) as Record<string, unknown>;
  const targets = (v.dailyTargets ?? {}) as Record<string, unknown>;
  const applicant = (v.applicant ?? {}) as Record<string, unknown>;
  const webhook = (v.webhook ?? {}) as Record<string, unknown>;

  const answers = Array.isArray(v.screeningAnswers) ? v.screeningAnswers : [];
  const seen = new Set<string>();
  const screeningAnswers: ScreeningAnswer[] = [];
  for (const a of answers) {
    const question = str((a as ScreeningAnswer)?.question, 300);
    const answer = str((a as ScreeningAnswer)?.answer, 1000);
    const key = question.toLowerCase();
    if (!question || !answer || seen.has(key)) continue;
    seen.add(key);
    screeningAnswers.push({ question, answer });
    if (screeningAnswers.length >= SCREENING_MAX) break;
  }

  const events = Array.isArray(webhook.events)
    ? WEBHOOK_EVENTS.filter((e) => (webhook.events as unknown[]).includes(e))
    : [];

  return {
    enabled: v.enabled === true,
    dailyTargets: Object.fromEntries(
      TARGET_PLATFORMS.map((p) => [p, int(targets[p], 0, TARGET_MAX, JOB_HUNT_DEFAULTS.dailyTargets[p])]),
    ) as Record<TargetPlatform, number>,
    autoPrepareTop: int(v.autoPrepareTop, 0, AUTO_PREPARE_MAX, 0),
    minFitForAutoPrepare: int(v.minFitForAutoPrepare, 0, 100, JOB_HUNT_DEFAULTS.minFitForAutoPrepare),
    reportEmail: v.reportEmail !== false,
    applicant: Object.fromEntries(
      APPLICANT_KEYS.map((k) => [k, str(applicant[k], k.endsWith("Url") ? 300 : 120)]),
    ) as ApplicantFacts,
    screeningAnswers,
    webhook: {
      url: str(webhook.url, 500),
      events,
      sealed: sealedFrom(webhook.sealed),
      last4: str(webhook.last4, 8),
      lastStatus: str(webhook.lastStatus, 120),
      lastAt: typeof webhook.lastAt === "string" ? webhook.lastAt : webhook.lastAt instanceof Date ? webhook.lastAt.toISOString() : null,
    },
  };
}

/* The webhook secret never leaves the server after it is shown once; the
   client sees whether one exists and its last four characters. */
export type JobHuntView = Omit<JobHuntSettings, "webhook"> & {
  webhook: Omit<WebhookSettings, "sealed"> & { hasSecret: boolean };
};

export function jobHuntView(s: JobHuntSettings): JobHuntView {
  const { sealed, ...webhook } = s.webhook;
  return { ...s, webhook: { ...webhook, hasSecret: Boolean(sealed) } };
}

/* A client PUT may change everything except the stored secret and the
   delivery bookkeeping; those are written by the server only. */
export function mergeClientPatch(current: JobHuntSettings, patch: unknown): JobHuntSettings {
  const p = (patch ?? {}) as Record<string, unknown>;
  const pw = (p.webhook ?? {}) as Record<string, unknown>;
  const next = normaliseJobHunt({
    ...current,
    ...p,
    dailyTargets: { ...current.dailyTargets, ...((p.dailyTargets as object) ?? {}) },
    applicant: { ...current.applicant, ...((p.applicant as object) ?? {}) },
    screeningAnswers: Array.isArray(p.screeningAnswers) ? p.screeningAnswers : current.screeningAnswers,
    webhook: {
      ...current.webhook,
      url: typeof pw.url === "string" ? pw.url : current.webhook.url,
      events: Array.isArray(pw.events) ? pw.events : current.webhook.events,
    },
  });
  return next;
}

export function targetPlatformFor(platform: string | null | undefined): TargetPlatform {
  const p = (platform ?? "").toLowerCase();
  if (p === "linkedin") return "linkedin";
  if (p === "xing") return "xing";
  if (p === "stepstone") return "stepstone";
  return "other";
}

export function totalTarget(s: Pick<JobHuntSettings, "dailyTargets">): number {
  return TARGET_PLATFORMS.reduce((sum, p) => sum + s.dailyTargets[p], 0);
}
