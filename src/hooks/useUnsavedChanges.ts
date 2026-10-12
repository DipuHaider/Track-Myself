"use client";

import { useCallback, useEffect } from "react";
import { useConfirm } from "@/components/shared/ConfirmDialog";

/* Warns before the browser leaves while a form is dirty, and gives overlays a
   confirm step for the same situation. The App Router has no navigation veto,
   so in-app links still rely on the overlay asking first. */
export function useUnsavedChanges(dirty: boolean, message = "Discard unsaved changes?") {
  const confirm = useConfirm();

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirmDiscard = useCallback(async () => {
    if (!dirty) return true;
    return confirm({
      title: message,
      message: "What you typed since the last save will be lost.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
      tone: "danger",
    });
  }, [confirm, dirty, message]);

  return { confirmDiscard };
}
