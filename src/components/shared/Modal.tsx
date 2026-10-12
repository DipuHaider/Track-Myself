"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { useDismissable } from "@/hooks/useDismissable";
import { useEscapeToClose } from "@/hooks/useModalStack";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "md" | "xl";
  initialFocusRef?: RefObject<HTMLElement | null>;
  onRequestClose?: () => boolean | Promise<boolean>;
  describedBy?: string;
};

/* Focus stays inside while open and returns to the opener on close; the page
   behind stops scrolling; Escape and the backdrop go through onRequestClose,
   which a dirty form can veto. Nested overlays close one layer per Escape. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  initialFocusRef,
  onRequestClose,
  describedBy,
}: ModalProps) {
  const { closing, close } = useDismissable(onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const requestClose = useCallback(async () => {
    if (onRequestClose && !(await onRequestClose())) return;
    close();
  }, [close, onRequestClose]);

  useEscapeToClose(requestClose, open);
  useFocusTrap(panelRef, open, initialFocusRef);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? "anim-backdrop-out" : "anim-backdrop"}`}
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => void requestClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`surface w-full ${size === "xl" ? "max-w-4xl" : "max-w-lg"} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border shadow-2xl outline-none ${closing ? "anim-panel-out" : "anim-panel"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="surface sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => void requestClose()}
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
