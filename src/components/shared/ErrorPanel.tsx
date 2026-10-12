"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export type ErrorPanelProps = {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
  zone?: string;
  homeHref?: string;
  homeLabel?: string;
};

export default function ErrorPanel({
  error,
  retry,
  reset,
  zone = "page",
  homeHref = "/",
  homeLabel = "Home",
}: ErrorPanelProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { zone } });
  }, [error, zone]);

  const tryAgain = retry ?? reset;

  return (
    <section
      role="alert"
      aria-labelledby="error-panel-title"
      className="surface mx-auto mt-10 max-w-xl rounded-2xl border p-8"
    >
      <div className="flex items-start gap-4">
        <span className="icon-chip status-rejected" aria-hidden="true">
          <AlertTriangle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted font-mono text-[11px] uppercase tracking-[0.18em]">Something went wrong</p>
          <h1 id="error-panel-title" className="mt-2 text-xl font-semibold">
            This {zone} could not be shown.
          </h1>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Nothing has been lost. Try again, or go back and come in another way. If it keeps
            happening, report it from the quick bubble and quote the reference below.
          </p>
          {error.digest && (
            <p className="text-muted mt-3 font-mono text-xs">Reference: {error.digest}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {tryAgain && (
              <button type="button" onClick={() => tryAgain()} className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm">
                <RotateCcw size={14} aria-hidden="true" /> Try again
              </button>
            )}
            <Link href={homeHref} className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm">
              <Home size={14} aria-hidden="true" /> {homeLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
