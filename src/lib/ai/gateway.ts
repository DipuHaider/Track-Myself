import { callProvider, type AICredential, type FailureKind } from "@/lib/cv/ai/provider";
import { isPremiumUser, isSuperAdmin } from "@/lib/permissions";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { closeLease, markDispatched, openLease, periodKey, sweepOrphans, type Lease } from "@/lib/ai/budget";
import { getAiConfig, modelForTask, type AiTaskId } from "@/lib/ai/config";
import { estimateNano, modelSpec, type ModelSpec } from "@/lib/ai/models";
import { recordCall } from "@/lib/ai/meter";
import { SYSTEM_PROMPT, repairPrompt } from "@/lib/ai/prompt";
import { extractJson } from "@/lib/ai/schemas";
import type { ZodType } from "zod";
import dbConnect from "@/lib/db";
import AiUsageCounter from "@/models/AiUsageCounter";
import type { AccountStatus, Plan, Role } from "@/lib/permissions";

export type Actor =
  | { kind: "user"; id: string; role: Role; plan: Plan; status?: AccountStatus; email?: string | null }
  | { kind: "anon"; ip: string };

export type AiDenialReason =
  | "disabled"
  | "no-route"
  | "paused"
  | "upgrade"
  | "rate-limit"
  | "user-quota"
  | "budget"
  | "upstream"
  | "unparsable";

export type AiRunResult =
  | {
      ok: true;
      text: string;
      modelId: string;
      provider: ModelSpec["provider"];
      providerLabel: string;
      usage: { inputTokens: number; outputTokens: number };
      callId: string;
      funding: "user" | "shared" | "superadmin";
    }
  | {
      ok: false;
      reason: AiDenialReason;
      message: string;
      kind?: FailureKind;
      retryAfterSeconds?: number;
    };

export type AiRunRequest = {
  task: AiTaskId;
  actor: Actor;
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
  userKey?: AICredential | null;
  rate?: { limit: number; windowMs: number };
  timeoutMs?: number;
};

export type Entitlement =
  | { allowed: true; via: "byok" | "premium" | "allowance"; note: string; used?: number; limit?: number }
  | { allowed: false; reason: "paused" | "disabled" | "no-route" | "upgrade"; message: string; used?: number; limit?: number };

const DEFAULT_RATE = { limit: 20, windowMs: 10 * 60 * 1000 };
const ORPHAN_MS = 120 * 1000;
const SWEEP_EVERY_MS = 60 * 1000;
const GEMINI_RETRY_KINDS = new Set<FailureKind>(["upstream", "rate-limited", "quota", "empty"]);

let lastSweepAt = 0;

/* Vercel has no guaranteed cron, so the sweeper rides in on ordinary traffic as
   well as the daily maintenance job. Throttled to once a minute per instance and
   capped at a handful of rows, it is free in the common case. */
async function maybeSweep(): Promise<void> {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_EVERY_MS) return;
  lastSweepAt = now;
  await sweepOrphans(ORPHAN_MS).catch(() => {});
}

function subjectOf(actor: Actor): string {
  return actor.kind === "user" ? `user:${actor.id}` : `ip:${actor.ip}`;
}

/* Anonymous callers are never funded by the operator. Everyone signed in shares
   one allowance; premium gets a larger one. Administrative rank does not grant
   inference — an editor or admin on a free plan is metered like any other free
   account, because permission to run the app is not permission to spend on it. */
function attemptLimit(actor: Actor, cfg: Awaited<ReturnType<typeof getAiConfig>>): number {
  if (actor.kind === "anon") return 0;
  if (isSuperAdmin(actor.role)) return cfg.premiumMonthlyAttempts;
  return isPremiumUser(actor.role, actor.plan) ? cfg.premiumMonthlyAttempts : cfg.freeMonthlyAttempts;
}

function sharedCredential(spec: ModelSpec): AICredential | null {
  const key = spec.envKey ? process.env[spec.envKey] : "";
  if (!key) return null;
  return {
    provider: spec.provider,
    apiKey: key,
    model: spec.model,
    baseUrl: spec.baseUrl,
    source: "shared",
  } as AICredential;
}

/* Diagnostics and pre-checks want to know whether a model is reachable, not what
   the key is. Exposing that here keeps every env read inside the gateway. */
export function sharedProviderStatus(): { anthropic: boolean; openai: boolean; gemini: boolean } {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
}

type Route = { spec: ModelSpec; credential: AICredential };

function sharedRoute(cfg: Awaited<ReturnType<typeof getAiConfig>>, task: AiTaskId): Route | null {
  const id = modelForTask(cfg, task);
  const spec = id ? modelSpec(id) : null;
  const credential = spec ? sharedCredential(spec) : null;
  return spec && credential ? { spec, credential } : null;
}

function geminiRoute(): Route | null {
  const spec = modelSpec("gemini:superadmin");
  const credential = spec ? sharedCredential(spec) : null;
  return spec && credential ? { spec, credential } : null;
}

export async function aiAllowanceStatus(actor: Actor): Promise<{ used: number; limit: number; periodKey: string }> {
  const cfg = await getAiConfig();
  const limit = attemptLimit(actor, cfg);
  const key = periodKey();
  await dbConnect();
  const row = (await AiUsageCounter.findById(`${subjectOf(actor)}|${key}`, "reserved").lean()) as
    | { reserved?: number }
    | null;
  return { used: row?.reserved ?? 0, limit, periodKey: key };
}

/* Who may run a task, and on whose money. A valid key the user brought unlocks
   every task on any plan and is never charged to the operator; premium runs on
   the shared model; a free account gets a small monthly allowance of shared
   attempts and then the feature's non-AI mode. */
export async function aiEntitlement(actor: Actor, task: AiTaskId, userKey?: AICredential | null): Promise<Entitlement> {
  if (actor.kind === "anon") {
    return { allowed: false, reason: "upgrade", message: "Sign in to use AI features." };
  }
  if (actor.status === "paused") {
    return { allowed: false, reason: "paused", message: "Your account is paused. Resume it from Settings to use AI." };
  }
  const cfg = await getAiConfig();
  if (!cfg.enabled) {
    return { allowed: false, reason: "disabled", message: "AI features are turned off." };
  }
  if (userKey?.apiKey) {
    return { allowed: true, via: "byok", note: "Using your own AI key." };
  }
  if (!sharedRoute(cfg, task)) {
    return { allowed: false, reason: "no-route", message: "AI is not configured on this deployment. Add your own key to use it." };
  }
  if (isSuperAdmin(actor.role) || isPremiumUser(actor.role, actor.plan)) {
    return { allowed: true, via: "premium", note: "" };
  }
  const { used, limit } = await aiAllowanceStatus(actor);
  if (used >= limit) {
    return {
      allowed: false,
      reason: "upgrade",
      message: `Your free AI allowance (${limit} a month) is used up. Add your own key or upgrade to Premium.`,
      used,
      limit,
    };
  }
  return { allowed: true, via: "allowance", note: `Free plan: ${used + 1} of ${limit} AI uses this month.`, used, limit };
}

export async function aiAvailableFor(actor: Actor, userKey?: AICredential | null, task: AiTaskId = "cv.adapt"): Promise<boolean> {
  if (userKey?.apiKey) return true;
  const cfg = await getAiConfig();
  if (!cfg.enabled || actor.kind !== "user") return false;
  return Boolean(sharedRoute(cfg, task));
}

function denial(reason: AiDenialReason, message: string, extra: Partial<AiRunResult> = {}): AiRunResult {
  return { ok: false, reason, message, ...extra } as AiRunResult;
}

function fundingOf(route: Route): "user" | "shared" | "superadmin" {
  if (route.credential.source === "user") return "user";
  return route.spec.funded ? "shared" : "superadmin";
}

async function dispatch(req: AiRunRequest, route: Route, lease: Lease, maxTokens: number): Promise<AiRunResult> {
  await markDispatched(lease);
  try {
    const call = await callProvider(route.credential, req.prompt, maxTokens, {
      system: req.system ?? SYSTEM_PROMPT,
      timeoutMs: req.timeoutMs,
    });

    await closeLease(lease, {
      dispatched: true,
      ok: call.ok,
      kind: call.ok ? "" : call.kind,
      error: call.ok ? "" : call.error,
      inputTokens: call.usage?.inputTokens ?? 0,
      outputTokens: call.usage?.outputTokens ?? 0,
    });

    await recordCall({
      userId: req.actor.kind === "user" ? req.actor.id : null,
      source: fundingOf(route),
      usage: call.usage,
      outcome: call.ok ? { ok: true } : { ok: false, kind: call.kind, error: call.error },
    });

    if (!call.ok) return denial("upstream", call.error, { kind: call.kind });

    return {
      ok: true,
      text: call.text,
      modelId: route.spec.id,
      provider: route.spec.provider,
      providerLabel: route.spec.label,
      usage: call.usage ?? { inputTokens: 0, outputTokens: 0 },
      callId: lease.callId,
      funding: fundingOf(route),
    };
  } catch (err) {
    await closeLease(lease, {
      dispatched: true,
      ok: false,
      kind: "upstream",
      error: err instanceof Error ? err.message : "unknown error",
    });
    return denial("upstream", "The model could not be reached.", { kind: "upstream" });
  }
}

/* The single governed path to a provider. Order is entitlement, then rate limit,
   then reservation, then dispatch, then settle — and settle is awaited, because
   a serverless function is frozen once its response is returned and anything
   left unawaited simply never runs.

   A key the user brought skips the attempt counter (it is their money) but still
   passes the rate limit and leaves a ledger row. A superadmin whose shared call
   fails upstream gets one more try on their personal Gemini key, which is
   neither counted nor charged. */
export async function runAiTask(req: AiRunRequest): Promise<AiRunResult> {
  await maybeSweep();

  const cfg = await getAiConfig();
  if (!cfg.enabled) return denial("disabled", "AI features are turned off.");
  if (req.actor.kind === "user" && req.actor.status === "paused") {
    return denial("paused", "Your account is paused, so AI features are off until you resume it.");
  }

  const byok = req.userKey?.apiKey ? req.userKey : null;
  const route: Route | null = byok
    ? { spec: specForUserKey(byok), credential: byok }
    : req.actor.kind === "user"
      ? sharedRoute(cfg, req.task)
      : null;

  if (!route) return denial("no-route", "No model is available for this request.");

  const subject = subjectOf(req.actor);
  const rate = req.rate ?? DEFAULT_RATE;
  const gate = await checkRateLimitDb({ key: `ai:${req.task}:${subject}`, ...rate });
  if (!gate.ok) {
    return denial("rate-limit", "Too many AI requests. Try again shortly.", {
      retryAfterSeconds: gate.retryAfterSeconds,
    });
  }

  const maxTokens = Math.min(req.maxOutputTokens ?? 2000, route.spec.maxOutputTokens);
  const counted = route.credential.source !== "user";

  const lease = await openLease({
    subject,
    userId: req.actor.kind === "user" ? req.actor.id : null,
    task: req.task,
    spec: route.spec,
    estNano: estimateNano(route.spec, req.prompt, maxTokens),
    attemptLimit: counted ? attemptLimit(req.actor, cfg) : null,
    ceilingNano: cfg.ceilingNano,
  });

  if (!lease.ok) {
    return lease.denial.reason === "budget"
      ? denial("budget", "The shared AI budget for this month is used up.")
      : denial("user-quota", "Your AI allowance for this month is used up.");
  }

  const first = await dispatch(req, route, lease.lease, maxTokens);
  if (first.ok || first.reason !== "upstream" || !first.kind || !GEMINI_RETRY_KINDS.has(first.kind)) return first;

  if (byok || req.actor.kind !== "user" || !isSuperAdmin(req.actor.role)) return first;
  const fallback = geminiRoute();
  if (!fallback) return first;

  const retryTokens = Math.min(req.maxOutputTokens ?? 2000, fallback.spec.maxOutputTokens);
  const retryLease = await openLease({
    subject,
    userId: req.actor.id,
    task: req.task,
    spec: fallback.spec,
    estNano: 0,
    attemptLimit: null,
    ceilingNano: cfg.ceilingNano,
  });
  if (!retryLease.ok) return first;

  const second = await dispatch(req, fallback, retryLease.lease, retryTokens);
  return second.ok ? second : first;
}

/* A key the user brought is described by the credential itself; it is never
   charged to the operator, so its price is irrelevant and left at zero. */
function specForUserKey(cred: AICredential): ModelSpec {
  const model = cred.model ?? cred.provider;
  return {
    id: `byok:${cred.provider}`,
    provider: cred.provider,
    model,
    label: model,
    baseUrl: cred.baseUrl,
    inputNanoPerToken: 0,
    outputNanoPerToken: 0,
    maxOutputTokens: 8000,
    funded: false,
    availability: "byok",
  };
}

export type AiJsonRequest<T> = AiRunRequest & {
  schema: ZodType<T>;
  kind: "object" | "array";
  schemaHint: string;
  repair?: boolean;
};

export type AiJsonResult<T> =
  | { ok: true; value: T; meta: Extract<AiRunResult, { ok: true }>; repaired: boolean }
  | Extract<AiRunResult, { ok: false }>;

/* Structured output is the common case, so the parse-and-repair loop lives
   here once. A reply that is not valid JSON for the schema earns exactly one
   repair call — a second billed attempt, counted like any other — and then the
   caller falls back to its non-AI mode. */
export async function runAiJsonTask<T>(req: AiJsonRequest<T>): Promise<AiJsonResult<T>> {
  const { schema, kind, schemaHint, repair, ...run } = req;
  const parse = (text: string) => {
    const raw = extractJson(text, kind);
    if (raw === null) return null;
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  };

  const first = await runAiTask(run);
  if (!first.ok) return first;
  const value = parse(first.text);
  if (value !== null) return { ok: true, value, meta: first, repaired: false };

  const unparsable = (label: string): Extract<AiRunResult, { ok: false }> => ({
    ok: false,
    reason: "unparsable",
    message: `${label} returned something that did not match the expected format.`,
  });

  if (repair === false) return unparsable(first.providerLabel);

  const second = await runAiTask({ ...run, prompt: repairPrompt(schemaHint, first.text) });
  if (!second.ok) return second;
  const repaired = parse(second.text);
  if (repaired !== null) return { ok: true, value: repaired, meta: second, repaired: true };
  return unparsable(second.providerLabel);
}
