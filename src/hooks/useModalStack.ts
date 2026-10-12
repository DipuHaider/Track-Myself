"use client";

import { useEffect, useRef } from "react";

const stack: symbol[] = [];

export function topOfStack(): symbol | null {
  return stack[stack.length - 1] ?? null;
}

/* Every overlay registers here while open, and only the top one reacts to
   Escape. Without the stack, a nested dialog and its parent both listened on
   document and one key press closed both layers. */
export function useEscapeToClose(onClose: () => void, active = true) {
  const handler = useRef(onClose);
  useEffect(() => {
    handler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const id = Symbol("overlay");
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && topOfStack() === id) {
        e.stopPropagation();
        handler.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = stack.indexOf(id);
      if (at !== -1) stack.splice(at, 1);
    };
  }, [active]);
}

export function stackDepth(): number {
  return stack.length;
}
