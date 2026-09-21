"use client";

import { useCallback, useEffect, useState } from "react";
import {
  A11Y_DEFAULTS, A11Y_EVENT, applyA11y, normaliseA11y, readStoredA11y,
  type A11yPrefs,
} from "@/lib/a11y";

export function useA11y() {
  const [prefs, setPrefs] = useState<A11yPrefs>(A11Y_DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      const local = readStoredA11y();
      setPrefs(local);
      applyA11y(local);
      setReady(true);
    });

    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((remote) => {
        if (cancelled || !remote) return;
        const merged = normaliseA11y(remote);
        setPrefs(merged);
        applyA11y(merged);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
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

  const update = useCallback((patch: Partial<A11yPrefs>) => {
    setPrefs((current) => {
      const next = normaliseA11y({ ...current, ...patch });
      applyA11y(next);
      fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });
  }, []);

  const reset = useCallback(() => update(A11Y_DEFAULTS), [update]);

  return { prefs, update, reset, ready };
}
