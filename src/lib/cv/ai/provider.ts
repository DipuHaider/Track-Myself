/* Which model answers an AI request, and how it is called. A credential is
   always passed in by the gateway (src/lib/ai/gateway.ts), which decides whose
   key runs: the user's own first, then the shared model, then the superadmin's
   personal Gemini fallback. Nothing here reads a key from the environment. */

export type AIProvider = "anthropic" | "gemini" | "openai-compatible";

export type AICredential = {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  source: "user" | "shared";
};

export type TokenUsage = { inputTokens: number; outputTokens: number };

export type FailureKind = "no-key" | "invalid" | "rate-limited" | "quota" | "upstream" | "empty";

export type ProviderCall =
  | { ok: true; text: string; usage: TokenUsage }
  | { ok: false; kind: FailureKind; error: string; usage?: TokenUsage };

export const ANTHROPIC_MODEL = "claude-sonnet-5";
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Claude",
  gemini: "Gemini",
  "openai-compatible": "OpenAI-compatible",
};

export const PROVIDER_DEFAULT_MODEL: Record<AIProvider, string> = {
  anthropic: ANTHROPIC_MODEL,
  gemini: DEFAULT_GEMINI_MODEL,
  "openai-compatible": DEFAULT_OPENAI_MODEL,
};

export function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/* Without the SDK's typed errors we map failures ourselves, so a BYOK user is told
   "your key is invalid" rather than a bare 4xx. Status alone is not enough: Gemini
   answers a bad key with 400, not 401, so the body is inspected too. */
function classifyFailure(status: number, body: string): FailureKind {
  if (status === 401 || status === 403) return "invalid";
  if (status === 429) return "rate-limited";
  if (status === 402) return "quota";

  const hay = body.toLowerCase();
  if (status === 400 && (hay.includes("api key") || hay.includes("api_key"))) return "invalid";
  if (hay.includes("quota") || hay.includes("billing") || hay.includes("insufficient")) return "quota";

  return "upstream";
}

/** True when a key exists for anyone, regardless of who is asking. */
export function anyProviderConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
}

const NO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0 };

import { assertSafeBaseUrl } from "@/lib/net/safeUrl";

export type CallOptions = { system?: string; timeoutMs?: number };

const DEFAULT_TIMEOUT_MS = 60_000;

function requestInit(opts: CallOptions): Pick<RequestInit, "signal" | "redirect"> {
  return { signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS), redirect: "manual" };
}

/* A user's own key talks to a host the user chose, so the response body is not
   echoed back to them — it could be anything. Shared providers are ours and the
   first few hundred characters are the most useful diagnostic there is. */
function errorDetail(cred: AICredential, body: string): string {
  return cred.source === "user" ? "" : `: ${body.slice(0, 300)}`;
}

async function callAnthropic(
  cred: AICredential,
  prompt: string,
  maxTokens: number,
  opts: CallOptions,
): Promise<ProviderCall> {
  const model = cred.model || ANTHROPIC_MODEL;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cred.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
    ...requestInit(opts),
  });

  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      kind: classifyFailure(res.status, body),
      error: `Anthropic ${res.status}${errorDetail(cred, body)}`,
    };
  }

  const data = await res.json();
  const usage: TokenUsage = {
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
  const text: string = data.content?.[0]?.text ?? "";

  return text.trim()
    ? { ok: true, text, usage }
    : {
        ok: false,
        kind: "empty",
        usage,
        error: `Anthropic returned no text (stop_reason: ${data.stop_reason ?? "unknown"}).`,
      };
}

async function callGemini(
  cred: AICredential,
  prompt: string,
  maxTokens: number,
  opts: CallOptions,
): Promise<ProviderCall> {
  const model = cred.model || geminiModel();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      /* Header rather than ?key= so the secret stays out of URLs and access logs. */
      headers: { "Content-Type": "application/json", "x-goog-api-key": cred.apiKey },
      ...requestInit(opts),
      body: JSON.stringify({
        ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          /* The 2.5 models spend part of this budget on thinking before any text
             is emitted, so it is set well above what the answer itself needs. */
          maxOutputTokens: maxTokens * 2,
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      kind: classifyFailure(res.status, body),
      error: `Gemini ${res.status} (model ${model})${errorDetail(cred, body)}`,
    };
  }

  const data = await res.json();
  const usage: TokenUsage = {
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };

  const candidate = data.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("");

  return text.trim()
    ? { ok: true, text, usage }
    : {
        ok: false,
        kind: "empty",
        usage,
        error: `Gemini returned no text (finishReason: ${candidate?.finishReason ?? "unknown"}, model ${model}).`,
      };
}

/* One shape covers OpenRouter, Groq, Together, DeepSeek and Ollama — they all speak
   /chat/completions with a bearer token, which is what makes "any model key" viable
   without a bespoke client per vendor. */
async function callOpenAICompatible(
  cred: AICredential,
  prompt: string,
  maxTokens: number,
  opts: CallOptions,
): Promise<ProviderCall> {
  const base = (cred.baseUrl || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
  const model = cred.model || DEFAULT_OPENAI_MODEL;

  if (cred.source === "user" && cred.baseUrl) {
    const safe = await assertSafeBaseUrl(cred.baseUrl);
    if (!safe.ok) return { ok: false, kind: "invalid", error: safe.error, usage: NO_USAGE };
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cred.apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
    }),
    ...requestInit(opts),
  });

  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      kind: classifyFailure(res.status, body),
      error: `${model} ${res.status}${errorDetail(cred, body)}`,
    };
  }

  const data = await res.json();
  const usage: TokenUsage = {
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
  const text: string = data.choices?.[0]?.message?.content ?? "";

  return text.trim()
    ? { ok: true, text, usage }
    : {
        ok: false,
        kind: "empty",
        usage,
        error: `${model} returned no text (finish_reason: ${data.choices?.[0]?.finish_reason ?? "unknown"}).`,
      };
}

export async function callProvider(
  cred: AICredential,
  prompt: string,
  maxTokens = 2000,
  opts: CallOptions = {},
): Promise<ProviderCall> {
  if (!cred.apiKey) {
    return { ok: false, kind: "no-key", error: `No ${PROVIDER_LABELS[cred.provider]} key.`, usage: NO_USAGE };
  }

  try {
    if (cred.provider === "anthropic") return await callAnthropic(cred, prompt, maxTokens, opts);
    if (cred.provider === "gemini") return await callGemini(cred, prompt, maxTokens, opts);
    return await callOpenAICompatible(cred, prompt, maxTokens, opts);
  } catch (err) {
    return {
      ok: false,
      kind: "upstream",
      usage: NO_USAGE,
      error: `${PROVIDER_LABELS[cred.provider]} request failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
