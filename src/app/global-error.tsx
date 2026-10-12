"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { A11Y_BOOT_SCRIPT } from "@/lib/a11y";

/* Replaces the root layout, so globals.css is not loaded here and nothing from
   the design system can be assumed. Inline styles only. */
export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { zone: "root" } });
  }, [error]);

  const tryAgain = retry ?? reset;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
        <title>Something went wrong · TrackMyself</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f1117",
          color: "#e6e8ef",
          padding: 24,
        }}
      >
        <main role="alert" style={{ maxWidth: 520, width: "100%" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>
            Something went wrong
          </p>
          <h1 style={{ fontSize: 24, margin: "8px 0 12px" }}>TrackMyself could not load.</h1>
          <p style={{ lineHeight: 1.6, opacity: 0.85 }}>
            Your applications and documents are safe on the server. Reload the page; if it keeps
            failing, email the maintainer with the reference below.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, opacity: 0.7 }}>
              Reference: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            {tryAgain && (
              <button
                type="button"
                onClick={() => tryAgain()}
                style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#3f63e0", color: "#fff", cursor: "pointer" }}
              >
                Try again
              </button>
            )}
            <Link href="/" style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #3a3f4e", color: "inherit", textDecoration: "none" }}>
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
