"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Trash2, Zap } from "lucide-react";
import { AI_KEY_EVENT, PROVIDER_OPTIONS, type AiKeyState } from "@/lib/ai/shared";

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  ok: { label: "Working", cls: "badge-mail-sent" },
  invalid: { label: "Key rejected", cls: "badge-mail-failed" },
  "rate-limited": { label: "Rate limited", cls: "badge-mail-failed" },
  quota: { label: "Out of quota", cls: "badge-mail-failed" },
  error: { label: "Last call failed", cls: "badge-mail-failed" },
};

function n(value: number) {
  return value.toLocaleString();
}

export default function AiKeyForm() {
  const [state, setState] = useState<AiKeyState | null>(null);
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = useCallback(() => {
    fetch("/api/user/ai-key")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AiKeyState | null) => {
        if (!d) return;
        setState(d);
        if (d.provider) setProvider(d.provider);
        if (d.model) setModel(d.model);
        if (d.baseUrl) setBaseUrl(d.baseUrl);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const option = PROVIDER_OPTIONS.find((p) => p.key === provider);

  const save = async () => {
    setBusy(true);
    setError("");
    setDone("");

    const res = await fetch("/api/user/ai-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, model, baseUrl }),
    }).catch(() => null);

    setBusy(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Could not save that key.");
      return;
    }

    setState(await res.json());
    setApiKey("");
    setDone("Key verified and saved. AI features are now using it.");
    window.dispatchEvent(new Event(AI_KEY_EVENT));
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    setDone("");
    await fetch("/api/user/ai-key", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setApiKey("");
    load();
    setDone("Key removed.");
    window.dispatchEvent(new Event(AI_KEY_EVENT));
  };

  const status = state?.status ? STATUS_COPY[state.status] : null;

  return (
    <div className="space-y-6">
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <KeyRound size={17} className="text-[var(--primary)]" aria-hidden="true" />
          Recharge with your own key
        </h2>
        <p className="text-muted mb-4 text-xs">
          Paste a key from your own provider account and every AI feature on the site runs on
          your quota. The key is encrypted before it is stored and is never shown again.
        </p>

        {state && !state.storageReady && (
          <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            This deployment has no AI_KEY_SECRET set, so keys cannot be stored yet.
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="ai-provider" className="mb-1.5 block text-sm font-medium">Provider</label>
            <select
              id="ai-provider"
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setModel(""); }}
              className="surface-muted w-full rounded-lg border px-3 py-2 text-sm"
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            {option && <p className="text-muted mt-1 text-[11px]">{option.hint}</p>}
          </div>

          <div>
            <label htmlFor="ai-key" className="mb-1.5 block text-sm font-medium">
              API secret key
            </label>
            <input
              id="ai-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={state?.configured ? `Currently ending …${state.last4} — paste a new key to replace it` : option?.placeholder}
              autoComplete="off"
              spellCheck={false}
              className="surface-muted w-full rounded-lg border px-3 py-2 font-mono text-sm"
            />
          </div>

          <div>
            <label htmlFor="ai-model" className="mb-1.5 block text-sm font-medium">
              Model <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={option?.defaultModel}
              spellCheck={false}
              className="surface-muted w-full rounded-lg border px-3 py-2 font-mono text-sm"
            />
            <p className="text-muted mt-1 text-[11px]">
              Leave blank for {option?.defaultModel}.
            </p>
          </div>

          {provider === "openai-compatible" && (
            <div>
              <label htmlFor="ai-base" className="mb-1.5 block text-sm font-medium">Base URL</label>
              <input
                id="ai-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                spellCheck={false}
                className="surface-muted w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
              <p className="text-muted mt-1 text-[11px]">
                Anything speaking /chat/completions — OpenRouter, Groq, Together, DeepSeek, Ollama.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {done && <p className="text-sm text-emerald-600">{done}</p>}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <button
              type="button"
              onClick={save}
              disabled={busy || apiKey.trim().length < 12 || !state?.storageReady}
              className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy
                ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Verifying…</>
                : <><CheckCircle2 size={14} aria-hidden="true" /> Verify and save</>}
            </button>

            {state?.configured && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="surface-muted flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                <Trash2 size={14} aria-hidden="true" />
                Remove key
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="surface rounded-xl border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Zap size={17} className="text-[var(--primary)]" aria-hidden="true" />
            Token usage
          </h2>
          {state?.configured && status && (
            <span className={`role-badge ${status.cls}`}>{status.label}</span>
          )}
        </div>

        {!state?.configured ? (
          <p className="text-muted text-sm">
            {state?.sharedKeyAvailable
              ? "No key of your own yet — AI features fall back to the site key where one is available."
              : "No key of your own yet, and this deployment has no shared key. AI features stay off until you add one."}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="surface-muted rounded-lg border p-3">
                <p className="text-muted text-[11px] uppercase tracking-wide">This month</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {n(state.usage.monthInputTokens + state.usage.monthOutputTokens)}
                </p>
                <p className="text-muted text-[11px]">
                  {n(state.usage.monthInputTokens)} in · {n(state.usage.monthOutputTokens)} out ·{" "}
                  {n(state.usage.monthCalls)} calls
                </p>
              </div>

              <div className="surface-muted rounded-lg border p-3">
                <p className="text-muted text-[11px] uppercase tracking-wide">All time</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {n(state.usage.inputTokens + state.usage.outputTokens)}
                </p>
                <p className="text-muted text-[11px]">
                  {n(state.usage.inputTokens)} in · {n(state.usage.outputTokens)} out ·{" "}
                  {n(state.usage.calls)} calls
                </p>
              </div>

              <div className="surface-muted rounded-lg border p-3">
                <p className="text-muted text-[11px] uppercase tracking-wide">Key</p>
                <p className="mt-1 font-mono text-sm">…{state.last4}</p>
                <p className="text-muted text-[11px]">
                  {state.model || "default model"}
                  {state.lastCallAt && ` · last used ${new Date(state.lastCallAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            {state.lastError && (
              <p className="mt-3 text-xs text-amber-600">{state.lastError}</p>
            )}

            <p className="text-muted mt-4 border-t pt-3 text-[11px]">
              These are tokens spent <strong>through TrackMyself</strong>, counted from what each
              response reports. Neither Anthropic nor Google exposes a remaining balance to an
              ordinary API key, so this is not your provider credit — check your provider
              dashboard for that.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
