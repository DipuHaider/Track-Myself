"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Modal from "@/components/shared/Modal";

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type Pending = { options: ConfirmOptions; resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(
  async () => false,
);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) =>
        setPending((previous) => {
          previous?.resolve(false);
          return { options, resolve };
        }),
      ),
    [],
  );

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const opts = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <Modal open onClose={() => settle(false)} title={opts.title}>
          {opts.message && <div className="text-muted whitespace-pre-line px-5 py-4 text-sm">{opts.message}</div>}
          <div className="flex justify-end gap-2 border-t px-5 py-4">
            <button
              type="button"
              autoFocus
              onClick={() => settle(false)}
              className="btn-secondary rounded-md px-4 py-2 text-sm"
            >
              {opts.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => settle(true)}
              className={
                opts.tone === "danger"
                  ? "btn-danger rounded-md px-4 py-2 text-sm font-medium"
                  : "btn-primary rounded-md px-4 py-2 text-sm"
              }
            >
              {opts.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
