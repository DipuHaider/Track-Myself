"use client";

import { useEffect, type ReactNode } from "react";
import { useDismissable } from "@/hooks/useDismissable";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { closing, close } = useDismissable(onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? "anim-backdrop-out" : "anim-backdrop"}`}
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={close}
    >
      <div
        className={`surface w-full max-w-lg rounded-xl border shadow-2xl ${closing ? "anim-panel-out" : "anim-panel"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
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
