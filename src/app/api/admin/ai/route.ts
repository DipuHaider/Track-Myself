export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import AiBudget from "@/models/AiBudget";
import { getAiConfig, saveAiConfig, AI_TASKS } from "@/lib/ai/config";
import { periodKey } from "@/lib/ai/budget";
import { MODEL_CATALOGUE, nanoToUsd, sharedModelIds } from "@/lib/ai/models";
import { sharedProviderStatus } from "@/lib/ai/gateway";

export async function GET() {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const cfg = await getAiConfig();
  const keys = sharedProviderStatus();
  const period = periodKey();
  const budget = (await AiBudget.findById(`global:${period}`).lean()) as
    | { reservedNano?: number; settledNano?: number; holdCount?: number }
    | null;

  /* A model is only usable if its key is actually present, so the UI can say
     why a toggle will not take effect rather than silently doing nothing. */
  const models = sharedModelIds().map((id) => {
    const spec = MODEL_CATALOGUE[id];
    const entry = cfg.sharedModels.find((m) => m.modelId === id);
    const provider = spec.provider === "anthropic" ? "anthropic" : spec.provider === "gemini" ? "gemini" : "openai";
    return {
      modelId: id,
      label: spec.label,
      enabled: entry?.enabled ?? false,
      order: entry?.order ?? 99,
      keyPresent: keys[provider as keyof typeof keys],
      inputPerMTokUsd: spec.inputNanoPerToken / 1000,
      outputPerMTokUsd: spec.outputNanoPerToken / 1000,
    };
  });

  return NextResponse.json({
    enabled: cfg.enabled,
    ceilingUsd: nanoToUsd(cfg.ceilingNano),
    freeMonthlyAttempts: cfg.freeMonthlyAttempts,
    premiumMonthlyAttempts: cfg.premiumMonthlyAttempts,
    anonDailyAttempts: cfg.anonDailyAttempts,
    models,
    tasks: AI_TASKS,
    taskModels: cfg.taskModels,
    period,
    spend: {
      reservedUsd: nanoToUsd(budget?.reservedNano ?? 0),
      settledUsd: nanoToUsd(budget?.settledNano ?? 0),
      inFlight: budget?.holdCount ?? 0,
    },
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  try {
    await saveAiConfig(body, auth.email ?? "");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 400 });
  }

  return GET();
}
