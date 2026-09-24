import { z } from "zod";
import dbConnect from "@/lib/db";
import AppSettings from "@/models/AppSettings";
import AiBudget from "@/models/AiBudget";
import { periodKey } from "@/lib/ai/budget";
import {
  DEFAULT_SHARED_MODEL,
  MODEL_CATALOGUE,
  sharedModelIds,
  usdToNano,
  type ModelId,
} from "@/lib/ai/models";

export type AiTaskId =
  | "cv.adapt"
  | "cv.preview"
  | "interview.questions"
  | "tools.banner-brief"
  | "cv.gap-analysis";

export const AI_TASKS: AiTaskId[] = [
  "cv.adapt",
  "cv.preview",
  "interview.questions",
  "tools.banner-brief",
  "cv.gap-analysis",
];

export type AiConfig = {
  enabled: boolean;
  sharedModels: { modelId: ModelId; enabled: boolean; order: number }[];
  ceilingNano: number;
  freeMonthlyAttempts: number;
  premiumMonthlyAttempts: number;
  anonDailyAttempts: number;
  taskModels: Partial<Record<AiTaskId, ModelId>>;
};

/* Haiku 4.5 is the only shared model on by default: it runs on the Anthropic
   credential that already exists, so nothing new has to be provisioned. Luna is
   catalogued and priced but stays off until OPENAI_API_KEY is present and an
   admin enables it. */
export const AI_CONFIG_DEFAULTS: AiConfig = {
  enabled: true,
  sharedModels: [
    { modelId: DEFAULT_SHARED_MODEL, enabled: true, order: 0 },
    { modelId: "anthropic:claude-sonnet-5", enabled: false, order: 1 },
    { modelId: "openai:gpt-6-luna", enabled: false, order: 2 },
  ],
  ceilingNano: usdToNano(9),
  freeMonthlyAttempts: 10,
  premiumMonthlyAttempts: 200,
  anonDailyAttempts: 0,
  taskModels: {},
};

const CACHE_TTL_MS = 15 * 1000;

let cached: { value: AiConfig; at: number } | null = null;

export function invalidateAiConfig() {
  cached = null;
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  ceilingUsd: z.number().min(0).max(1000).optional(),
  freeMonthlyAttempts: z.number().int().min(0).max(100000).optional(),
  premiumMonthlyAttempts: z.number().int().min(0).max(100000).optional(),
  anonDailyAttempts: z.number().int().min(0).max(100000).optional(),
  sharedModels: z
    .array(
      z.object({
        modelId: z.string().refine((id) => id in MODEL_CATALOGUE, "Unknown model"),
        enabled: z.boolean(),
        order: z.number().int().min(0).max(99),
      }),
    )
    .optional(),
  taskModels: z.record(z.string(), z.string()).optional(),
});

export type AiConfigPatch = z.infer<typeof patchSchema>;

export async function getAiConfig(): Promise<AiConfig> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    await dbConnect();
    const doc = (await AppSettings.findOne({ key: "default" }, "ai").lean()) as
      | { ai?: Partial<AiConfig> & { ceilingUsd?: number } }
      | null;

    const ai = doc?.ai;
    const known = new Set(sharedModelIds());

    const value: AiConfig = {
      enabled: ai?.enabled ?? AI_CONFIG_DEFAULTS.enabled,
      sharedModels: (ai?.sharedModels?.length ? ai.sharedModels : AI_CONFIG_DEFAULTS.sharedModels)
        .filter((m) => known.has(m.modelId))
        .sort((a, b) => a.order - b.order),
      ceilingNano:
        typeof ai?.ceilingUsd === "number" ? usdToNano(ai.ceilingUsd) : AI_CONFIG_DEFAULTS.ceilingNano,
      freeMonthlyAttempts: ai?.freeMonthlyAttempts ?? AI_CONFIG_DEFAULTS.freeMonthlyAttempts,
      premiumMonthlyAttempts: ai?.premiumMonthlyAttempts ?? AI_CONFIG_DEFAULTS.premiumMonthlyAttempts,
      anonDailyAttempts: ai?.anonDailyAttempts ?? AI_CONFIG_DEFAULTS.anonDailyAttempts,
      taskModels: (ai?.taskModels as Partial<Record<AiTaskId, ModelId>>) ?? {},
    };

    cached = { value, at: Date.now() };
    return value;
  } catch {
    return AI_CONFIG_DEFAULTS;
  }
}

/* Deliberately a sibling of saveAppSettings rather than an extension of it: that
   function's three-field whitelist is correct, and widening it is how unvalidated
   keys start reaching the singleton.

   The ceiling is written through to the current period's budget document in the
   same request. Nothing else should read a ceiling from config — the reservation
   guard compares against the document, so lowering the ceiling bites at once
   rather than after the cache expires. */
export async function saveAiConfig(patch: unknown, updatedBy: string): Promise<AiConfig> {
  const parsed = patchSchema.parse(patch);

  await dbConnect();

  const update: Record<string, unknown> = { updatedBy };
  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) continue;
    update[`ai.${key}`] = value;
  }

  await AppSettings.findOneAndUpdate({ key: "default" }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).lean();

  if (typeof parsed.ceilingUsd === "number") {
    await AiBudget.updateOne(
      { _id: `global:${periodKey()}` },
      { $set: { ceilingNano: usdToNano(parsed.ceilingUsd) } },
    ).catch(() => {});
  }

  invalidateAiConfig();
  return getAiConfig();
}

export function modelForTask(cfg: AiConfig, task: AiTaskId): ModelId | null {
  const pinned = cfg.taskModels[task];
  if (pinned && cfg.sharedModels.some((m) => m.modelId === pinned && m.enabled)) return pinned;
  return cfg.sharedModels.find((m) => m.enabled)?.modelId ?? null;
}
