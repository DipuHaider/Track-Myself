import dbConnect from "@/lib/db";
import User from "@/models/User";
import { decryptSecret, secretBoxReady } from "@/lib/crypto/secretBox";
import {
  PROVIDER_DEFAULT_MODEL, callProvider,
  type AICredential, type AIProvider, type FailureKind, type TokenUsage,
} from "@/lib/cv/ai/provider";

export const AI_PROVIDERS: AIProvider[] = ["anthropic", "gemini", "openai-compatible"];

export type StoredKey = {
  provider?: AIProvider | null;
  model?: string;
  baseUrl?: string;
  ciphertext?: string;
  iv?: string;
  tag?: string;
  last4?: string;
  addedAt?: Date | null;
  status?: string;
  lastError?: string;
  lastCheckedAt?: Date | null;
};

export type StoredUsage = {
  inputTokens?: number;
  outputTokens?: number;
  calls?: number;
  lastCallAt?: Date | null;
  monthKey?: string;
  monthInputTokens?: number;
  monthOutputTokens?: number;
  monthCalls?: number;
};

export function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getUserCredential(userId: string): Promise<AICredential | null> {
  if (!secretBoxReady()) return null;

  await dbConnect();
  const row = (await User.findById(userId, "aiKey").lean()) as { aiKey?: StoredKey } | null;
  const key = row?.aiKey;
  if (!key?.provider || !key.ciphertext || !key.iv || !key.tag) return null;

  try {
    return {
      provider: key.provider,
      apiKey: decryptSecret({ ciphertext: key.ciphertext, iv: key.iv, tag: key.tag }),
      model: key.model || PROVIDER_DEFAULT_MODEL[key.provider],
      baseUrl: key.baseUrl || undefined,
      source: "user",
    };
  } catch {
    /* Wrong or rotated AI_KEY_SECRET — treat as no key rather than crashing the call. */
    return null;
  }
}


/* A one-token probe so the form can reject a bad key immediately rather than
   letting it fail later inside a CV generation the user has already waited for. */
export async function validateKey(cred: AICredential) {
  const call = await callProvider(cred, "Reply with the single word: ok", 16);
  if (call.ok) return { ok: true as const };
  if (call.kind === "empty") return { ok: true as const };
  return { ok: false as const, kind: call.kind, error: call.error };
}
