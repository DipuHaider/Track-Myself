"use client";

import { useEffect } from "react";

let locks = 0;
let previous = "";

/* Ref-counted so nested overlays do not unlock the page when the inner one
   closes. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks === 0) {
      previous = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }
    locks++;
    return () => {
      locks--;
      if (locks === 0) document.documentElement.style.overflow = previous;
    };
  }, [active]);
}
