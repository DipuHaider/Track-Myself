"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { AI_KEY_EVENT, PROVIDER_OPTIONS, type AiKeyState } from "@/lib/ai/shared";

const POLL_MS = 60000;
const CHANNEL = "tm-ai-key";

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export default function AiKeyPill() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  const [state, setState] = useState<AiKeyState | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!signedIn) {
      setState(null);
      return;
    }
    fetch("/api/user/ai-key")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AiKeyState | null) => setState(d))
      .catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    queueMicrotask(load);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => load();
    } catch {}

    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener(AI_KEY_EVENT, load);

    return () => {
      channel?.close();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener(AI_KEY_EVENT, load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Element)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!signedIn || !state?.configured) return null;

  const total = state.usage.monthInputTokens + state.usage.monthOutputTokens;
  const unhealthy = state.status !== "ok";
  const label = PROVIDER_OPTIONS.find((p) => p.key === state.provider)?.label ?? state.provider;

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ai-pill"
        data-warn={unhealthy || undefined}
        aria-label={`AI key: ${label}, ${total} tokens used this month`}
        aria-expanded={open}
      >
        {unhealthy
          ? <AlertTriangle size={13} aria-hidden="true" />
          : <Sparkles size={13} aria-hidden="true" />}
        <span className="font-mono">{compact(total)}</span>
      </button>

      {open && (
        <div className="notif-panel anim-panel" role="menu" style={{ width: "17rem" }}>
          <div className="notif-head">
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-muted font-mono text-[11px]">…{state.last4}</span>
          </div>

          <div className="space-y-2 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs">This month</span>
              <span className="font-mono tabular-nums">{total.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs">All time</span>
              <span className="font-mono tabular-nums">
                {(state.usage.inputTokens + state.usage.outputTokens).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs">Calls</span>
              <span className="font-mono tabular-nums">{state.usage.calls.toLocaleString()}</span>
            </div>

            {unhealthy && (
              <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700">
                {state.lastError || "The last call with this key failed."}
              </p>
            )}

            <p className="text-muted border-t pt-2 text-[11px]">
              Tokens spent through TrackMyself — not your provider balance.
            </p>
          </div>

          <Link href="/me/ai-key" onClick={() => setOpen(false)} className="notif-foot">
            Manage AI key
          </Link>
        </div>
      )}
    </div>
  );
}
