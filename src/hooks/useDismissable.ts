"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps an overlay mounted long enough to play its exit animation.
 *
 * React unmounts immediately on state change, so a closing modal would vanish
 * mid-transition. Call `close()` instead of the parent's `onClose`: it flips
 * `closing` (swap in the -out classes) and unmounts once the animation is done.
 *
 * Falls through instantly when the user prefers reduced motion.
 */
export function useDismissable(onClose: () => void, ms = 130) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const close = useCallback(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) { onClose(); return; }
    if (timer.current) return;

    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      onClose();
    }, ms);
  }, [onClose, ms]);

  return { closing, close };
}
