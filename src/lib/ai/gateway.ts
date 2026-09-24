import { callProvider, type AICredential, type FailureKind } from "@/lib/cv/ai/provider";
import { isPremiumUser, isSuperAdmin } from "@/lib/permissions";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { closeLease, markDispatched, openLease, sweepOrphans } from "@/lib/ai/budget";
import { getAiConfig, modelForTask, type AiTaskId } from "@/lib/ai/config";
import { estimateNano, modelSpec, type ModelSpec } from "@/lib/ai/models";
import { recordCall } from "@/lib/ai/meter";
import type { Plan, Role } from "@/lib/permissions";

export type Actor =
  | { kind: "user"; id: string; role: Role; plan: Plan; email?: string | null }
  | { kind: "anon"; ip: string };

export type AiDenialReason =
  | "disabled"
  | "no-route"
  | "rate-limit"
  | "user-quota"
  | "budget"
  | "upstream";

export type AiRunResult =
  | {
      ok: true;
      text: string;
      modelId: string;
      providerLabel: string;
      usage: { inputTokens: number; outputTokens: number };
      callId: string;
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
  maxOutputTokens?: number;
  userKey?: AICredential | null;
  rate?: { limit: number; windowMs: number };
};

const DEFAULT_RATE = { limit: 20, windowMs: 10 * 60 * 1000 };
const ORPHAN_MS = 120 * 1000;
const SWEEP_EVERY_MS = 60 * 1000;

let lastSweepAt = 0;

/* Vercel has no guaranteed cron, so the sweeper rides in on ordinary traffic.
   Throttled to once a minute per instance and capped at a handful of rows, it is
   free in the common case. A vercel.json cron can call sweepOrphans directly
   later without changing anything here. */
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
function attemptLimit(
  actor: Actor,
  cfg: Awaited<ReturnType<typeof getAiConfig>>,
): number {
  if (actor.kind === "anon") return cfg.anonDailyAttempts;
  if (isSuperAdmin(actor.role)) return cfg.premiumMonthlyAttempts;
  return isPremiumUser(actor.role, actor.plan)
    ? cfg.premiumMonthlyAttempts
    : cfg.freeMonthlyAttempts;
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
export function sharedProviderStatus(): {
  anthropic: boolean;
  openai: boolean;
  gemini: boolean;
} {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
}

export async function aiAvailableFor(actor: Actor, userKey?: AICredential | null): Promise<boolean> {
  if (userKey?.apiKey) return true;
  const cfg = await getAiConfig();
  if (!cfg.enabled || actor.kind !== "user") return false;
  const id = modelForTask(cfg, "cv.adapt");
  const spec = id ? modelSpec(id) : null;
  return Boolean(spec && sharedCredential(spec));
}

function denial(reason: AiDenialReason, message: string, extra: Partial<AiRunResult> = {}): AiRunResult {
  return { ok: false, reason, message, ...extra } as AiRunResult;
}

/* The single governed path to a provider. Order is entitlement, then rate limit,
   then reservation, then dispatch, then settle — and settle is awaited, because
   a serverless function is frozen once its response is returned and anything
   left unawaited simply never runs. That is why the existing fire-and-forget
   usage writes record nothing in production. */
export async function runAiTask(req: AiRunRequest): Promise<AiRunResult> {
  await maybeSweep();

  const cfg = await getAiConfig();
  if (!cfg.enabled) return denial("disabled", "AI features are turned off.");

  const byok = req.userKey?.apiKey ? req.userKey : null;

  const sharedId = req.actor.kind === "user" ? modelForTask(cfg, req.task) : null;
  const sharedSpec = sharedId ? modelSpec(sharedId) : null;
  const shared = sharedSpec ? sharedCredential(sharedSpec) : null;

  const route = byok
    ? { spec: specForUserKey(byok), credential: byok }
    : shared && sharedSpec
      ? { spec: sharedSpec, credential: shared }
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
  const estNano = estimateNano(route.spec, req.prompt, maxTokens);

  const lease = await openLease({
    subject,
    userId: req.actor.kind === "user" ? req.actor.id : null,
    task: req.task,
    spec: route.spec,
    estNano,
    attemptLimit: attemptLimit(req.actor, cfg),
    ceilingNano: cfg.ceilingNano,
  });

  if (!lease.ok) {
    return lease.denial.reason === "budget"
      ? denial("budget", "The shared AI budget for this month is used up.")
      : denial("user-quota", "Your AI allowance for this month is used up.");
  }

  await markDispatched(lease.lease);

  try {
    const call = await callProvider(route.credential, req.prompt, maxTokens);

    await closeLease(lease.lease, {
      dispatched: true,
      ok: call.ok,
      kind: call.ok ? "" : call.kind,
      error: call.ok ? "" : call.error,
      inputTokens: call.usage?.inputTokens ?? 0,
      outputTokens: call.usage?.outputTokens ?? 0,
    });

    await recordCall({
      userId: req.actor.kind === "user" ? req.actor.id : null,
      source: route.credential.source === "user" ? "user" : route.spec.funded ? "shared" : "superadmin",
      usage: call.usage,
      outcome: call.ok ? { ok: true } : { ok: false, kind: call.kind, error: call.error },
    });

    if (!call.ok) {
      return denial("upstream", call.error, { kind: call.kind });
    }

    return {
      ok: true,
      text: call.text,
      modelId: route.spec.id,
      providerLabel: route.spec.label,
      usage: call.usage ?? { inputTokens: 0, outputTokens: 0 },
      callId: lease.lease.callId,
    };
  } catch (err) {
    await closeLease(lease.lease, {
      dispatched: true,
      ok: false,
      kind: "upstream",
      error: err instanceof Error ? err.message : "unknown error",
    });
    return denial("upstream", "The model could not be reached.", { kind: "upstream" });
  }
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
