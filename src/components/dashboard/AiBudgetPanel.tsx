"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, TriangleAlert } from "lucide-react";

type ModelRow = {
  modelId: string;
  label: string;
  enabled: boolean;
  order: number;
  keyPresent: boolean;
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
};

type AiAdminConfig = {
  enabled: boolean;
  ceilingUsd: number;
  freeMonthlyAttempts: number;
  premiumMonthlyAttempts: number;
  anonDailyAttempts: number;
  models: ModelRow[];
  period: string;
  spend: { reservedUsd: number; settledUsd: number; inFlight: number };
};

const NUMBERS: { key: keyof AiAdminConfig; label: string; hint: string; step: number }[] = [
  { key: "ceilingUsd", label: "Monthly ceiling (USD)", hint: "No shared-key call starts once this is committed.", step: 1 },
  { key: "freeMonthlyAttempts", label: "Free plan attempts / month", hint: "Then AI features fall back to their non-AI mode.", step: 1 },
  { key: "premiumMonthlyAttempts", label: "Premium attempts / month", hint: "Premium raises this cap but not the ceiling above.", step: 10 },
];

function Switch({ on, disabled, label, onClick }: {
  on: boolean; disabled: boolean; label: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-50"
      style={{
        background: on ? "var(--primary)" : "var(--surface-2)",
        borderColor: on ? "var(--primary)" : "var(--border)",
      }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "1.5rem" : "0.2rem" }}
      />
    </button>
  );
}

export default function AiBudgetPanel() {
  const [cfg, setCfg] = useState<AiAdminConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/ai")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCfg(d))
      .catch(() => setCfg(null));
  }, []);

  useEffect(load, [load]);

  const save = async (patch: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");

    const res = await fetch("/api/admin/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);

    setBusy(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Could not save.");
      load();
      return;
    }
    setCfg(await res.json());
  };

  if (!cfg) return null;

  const toggleModel = (row: ModelRow) =>
    save({
      sharedModels: cfg.models.map((m) => ({
        modelId: m.modelId,
        enabled: m.modelId === row.modelId ? !m.enabled : m.enabled,
        order: m.order,
      })),
    });

  const remaining = Math.max(0, cfg.ceilingUsd - cfg.spend.settledUsd);

  return (
    <div className="surface rounded-xl border p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Bot size={16} aria-hidden="true" />
        AI budget and models
      </h3>
      <p className="text-muted mb-4 text-xs">
        Applies to every AI feature that spends the deployment&apos;s own key. A user&apos;s own key
        and the superadmin Gemini fallback are never charged here, and each feature keeps its
        non-AI fallback when an allowance runs out.
      </p>

      <div className="surface-muted mb-4 grid grid-cols-3 gap-3 rounded-lg border p-3">
        <div>
          <p className="text-muted text-[11px]">Spent · {cfg.period}</p>
          <p className="text-sm font-semibold tabular-nums">${cfg.spend.settledUsd.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-muted text-[11px]">Remaining</p>
          <p className="text-sm font-semibold tabular-nums">${remaining.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted text-[11px]">In flight</p>
          <p className="text-sm font-semibold tabular-nums">{cfg.spend.inFlight}</p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 border-b py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">AI features</p>
          <p className="text-muted text-xs">
            Turning this off sends every feature to its heuristic or static mode. Takes up to 15
            seconds to reach all servers.
          </p>
        </div>
        <Switch on={cfg.enabled} disabled={busy} label="AI features" onClick={() => save({ enabled: !cfg.enabled })} />
      </div>

      <p className="text-muted mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wide">
        Shared models
      </p>
      {cfg.models.map((m) => (
        <div key={m.modelId} className="flex items-start justify-between gap-4 border-b py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{m.label}</p>
            <p className="text-muted text-xs tabular-nums">
              ${m.inputPerMTokUsd.toFixed(2)} in / ${m.outputPerMTokUsd.toFixed(2)} out per million tokens
            </p>
            {!m.keyPresent && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                <TriangleAlert size={11} aria-hidden="true" />
                No API key set for this provider — enabling it will have no effect.
              </p>
            )}
          </div>
          <Switch on={m.enabled} disabled={busy} label={m.label} onClick={() => toggleModel(m)} />
        </div>
      ))}

      <p className="text-muted mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wide">
        Limits
      </p>
      {NUMBERS.map((f) => (
        <div key={f.key} className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
          <div className="min-w-0">
            <p className="text-sm font-medium">{f.label}</p>
            <p className="text-muted text-xs">{f.hint}</p>
          </div>
          <input
            type="number"
            min={0}
            step={f.step}
            defaultValue={cfg[f.key] as number}
            disabled={busy}
            onBlur={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value) || value === cfg[f.key]) return;
              save({ [f.key]: value });
            }}
            className="surface-muted w-24 shrink-0 rounded-md border px-2 py-1 text-right text-sm tabular-nums"
          />
        </div>
      ))}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
