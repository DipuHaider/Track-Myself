"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useDismissable } from "@/hooks/useDismissable";

const openModals: symbol[] = [];

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "md" | "xl";
}) {
  const { closing, close } = useDismissable(onClose);
  const closeRef = useRef(close);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    openModals.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals[openModals.length - 1] === id) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openModals.splice(openModals.indexOf(id), 1);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? "anim-backdrop-out" : "anim-backdrop"}`}
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`surface w-full ${size === "xl" ? "max-w-4xl" : "max-w-lg"} rounded-xl border shadow-2xl ${closing ? "anim-panel-out" : "anim-panel"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="rounded-md px-2 py-1 text-sm transition hover:bg-[var(--surface-2)]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
