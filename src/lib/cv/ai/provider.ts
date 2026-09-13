/**
 * Which model answers an AI request, and how it is called.
 *
 * Anthropic is the primary provider for every entitled user. Gemini is a personal
 * fallback: it spends the superadmin's own key, so it is never offered to anyone
 * else — a premium user on a deployment with no Anthropic key gets the heuristic,
 * not somebody else's quota.
 */

export type AIProvider = "anthropic" | "gemini";

export type ProviderCall =
  | { ok: true; text: string }
  | { ok: false; kind: "no-key" | "upstream" | "empty"; error: string };

export const ANTHROPIC_MODEL = "claude-sonnet-5";
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Claude",
  gemini: "Gemini",
};

export function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/** Ordered: the first that can run, runs. A later entry is tried only on failure. */
export function providerChain(opts: { superadmin: boolean }): AIProvider[] {
  const chain: AIProvider[] = [];
  if (process.env.ANTHROPIC_API_KEY) chain.push("anthropic");
  if (process.env.GEMINI_API_KEY && opts.superadmin) chain.push("gemini");
  return chain;
}

export function aiConfigured(opts: { superadmin: boolean }) {
  return providerChain(opts).length > 0;
}

/** True when a key exists for anyone, regardless of who is asking. */
export function anyProviderConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
}

async function callAnthropic(prompt: string, maxTokens: number): Promise<ProviderCall> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, kind: "no-key", error: "ANTHROPIC_API_KEY is not set." };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return { ok: false, kind: "upstream", error: `Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}` };
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  return text.trim()
    ? { ok: true, text }
    : { ok: false, kind: "empty", error: `Anthropic returned no text (stop_reason: ${data.stop_reason ?? "unknown"}).` };
}

async function callGemini(prompt: string, maxTokens: number): Promise<ProviderCall> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, kind: "no-key", error: "GEMINI_API_KEY is not set." };

  const model = geminiModel();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      /* Header rather than ?key= so the secret stays out of URLs and access logs. */
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
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
    return {
      ok: false,
      kind: "upstream",
      error: `Gemini ${res.status} (model ${model}): ${(await res.text()).slice(0, 300)}`,
    };
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("");

  return text.trim()
    ? { ok: true, text }
    : {
        ok: false,
        kind: "empty",
        error: `Gemini returned no text (finishReason: ${candidate?.finishReason ?? "unknown"}, model ${model}).`,
      };
}

export async function callProvider(
  provider: AIProvider,
  prompt: string,
  maxTokens = 2000,
): Promise<ProviderCall> {
  try {
    return provider === "anthropic"
      ? await callAnthropic(prompt, maxTokens)
      : await callGemini(prompt, maxTokens);
  } catch (err) {
    return {
      ok: false,
      kind: "upstream",
      error: `${PROVIDER_LABELS[provider]} request failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
