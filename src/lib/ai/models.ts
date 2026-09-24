import type { AIProvider } from "@/lib/cv/ai/provider";

/* Nano-dollars throughout, as whole numbers. A price per million tokens in USD
   becomes nano-dollars per token by multiplying by 1000, which stays an integer
   for every model here — including GPT-6 Luna at $0.10/MTok, where micro-dollars
   would have rounded to a fraction. A month's ceiling of $9 is 9e9 nano, well
   inside the range a double represents exactly. */
export const NANO_PER_USD = 1_000_000_000;

export function usdToNano(usd: number): number {
  return Math.round(usd * NANO_PER_USD);
}

export function nanoToUsd(nano: number): number {
  return nano / NANO_PER_USD;
}

function perMTok(usd: number): number {
  return Math.round(usd * 1000);
}

export type ModelId = string;

export type ModelSpec = {
  id: ModelId;
  provider: AIProvider;
  model: string;
  label: string;
  baseUrl?: string;
  envKey?: "ANTHROPIC_API_KEY" | "OPENAI_API_KEY" | "GEMINI_API_KEY";
  inputNanoPerToken: number;
  outputNanoPerToken: number;
  maxOutputTokens: number;
  /* Whether an attempt on this model draws on the operator's money. The
     superadmin's Gemini key and any key a user brings are logged and rate
     limited, but never charged to the shared ceiling — they are not the
     operator's spend to cap. */
  funded: boolean;
  availability: "shared" | "superadmin" | "byok";
};

export const MODEL_CATALOGUE: Record<ModelId, ModelSpec> = {
  "anthropic:claude-haiku-4-5": {
    id: "anthropic:claude-haiku-4-5",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    envKey: "ANTHROPIC_API_KEY",
    inputNanoPerToken: perMTok(1),
    outputNanoPerToken: perMTok(5),
    maxOutputTokens: 8000,
    funded: true,
    availability: "shared",
  },
  "anthropic:claude-sonnet-5": {
    id: "anthropic:claude-sonnet-5",
    provider: "anthropic",
    model: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    envKey: "ANTHROPIC_API_KEY",
    inputNanoPerToken: perMTok(2),
    outputNanoPerToken: perMTok(10),
    maxOutputTokens: 8000,
    funded: true,
    availability: "shared",
  },
  /* Priced and ready, but reachable only once OPENAI_API_KEY exists and an admin
     enables it. Adding a second shared provider is then configuration, not code. */
  "openai:gpt-6-luna": {
    id: "openai:gpt-6-luna",
    provider: "openai-compatible",
    model: "gpt-6-luna",
    label: "GPT-6 Luna",
    baseUrl: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    inputNanoPerToken: perMTok(0.1),
    outputNanoPerToken: perMTok(0.5),
    maxOutputTokens: 8000,
    funded: true,
    availability: "shared",
  },
  /* The superadmin's personal key. Left exactly as it was: never offered to
     anyone else, and outside the shared ledger. */
  "gemini:superadmin": {
    id: "gemini:superadmin",
    provider: "gemini",
    model: "gemini-3.6-flash",
    label: "Gemini (superadmin)",
    envKey: "GEMINI_API_KEY",
    inputNanoPerToken: 0,
    outputNanoPerToken: 0,
    maxOutputTokens: 8000,
    funded: false,
    availability: "superadmin",
  },
};

export const DEFAULT_SHARED_MODEL: ModelId = "anthropic:claude-haiku-4-5";

export function modelSpec(id: ModelId): ModelSpec | null {
  return MODEL_CATALOGUE[id] ?? null;
}

export function sharedModelIds(): ModelId[] {
  return Object.values(MODEL_CATALOGUE)
    .filter((m) => m.availability === "shared")
    .map((m) => m.id);
}

/* Reserved cost is the worst case: output is hard-capped by maxTokens, so only
   the input estimate can run under. The consequence is that the ceiling is soft
   by at most the input error times the number of calls in flight — which is the
   right direction to be wrong, and cheaper than tokenising every prompt. */
export function estimateNano(spec: ModelSpec, prompt: string, maxTokens: number): number {
  if (!spec.funded) return 0;
  const inputTokens = Math.ceil(prompt.length / 4) + 64;
  return inputTokens * spec.inputNanoPerToken + maxTokens * spec.outputNanoPerToken;
}

export function actualNano(spec: ModelSpec, inputTokens: number, outputTokens: number): number {
  if (!spec.funded) return 0;
  return inputTokens * spec.inputNanoPerToken + outputTokens * spec.outputNanoPerToken;
}
