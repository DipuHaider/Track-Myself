"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  A11Y_DEFAULTS, A11Y_EVENT, applyA11y, normaliseA11y, readStoredA11y,
  type A11yPrefs,
} from "@/lib/a11y";
import { apiFetch } from "@/lib/api/client";

const SAVE_DEBOUNCE_MS = 600;

/* Local storage is the source of truth on this device; the account copy is
   merged in once per sign-in by A11ySync. Saves are debounced so a run of
   toggles becomes one PUT, and nothing is sent while signed out. */
export function useA11y() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [prefs, setPrefs] = useState<A11yPrefs>(A11Y_DEFAULTS);
  const [ready, setReady] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const local = readStoredA11y();
      setPrefs(local);
      applyA11y(local);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const sync = () => setPrefs(readStoredA11y());
    window.addEventListener(A11Y_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(A11Y_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (prefs.scheme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyA11y(readStoredA11y());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [prefs.scheme]);

  const persist = useCallback(
    (next: A11yPrefs) => {
      if (!signedIn) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        apiFetch("/api/user/preferences", { method: "PUT", json: next }).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    },
    [signedIn],
  );

  const update = useCallback(
    (patch: Partial<A11yPrefs>) => {
      setPrefs((current) => {
        const next = normaliseA11y({ ...current, ...patch });
        applyA11y(next);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => update(A11Y_DEFAULTS), [update]);

  return { prefs, update, reset, ready, signedIn };
}
