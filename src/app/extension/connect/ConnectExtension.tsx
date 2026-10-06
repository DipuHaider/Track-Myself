"use client";

import { useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { Spinner } from "@/components/shared/Spinner";

type ExtensionRuntime = {
  sendMessage: (id: string, msg: unknown, cb: (reply?: { ok?: boolean }) => void) => void;
  lastError?: { message?: string };
};

function extensionRuntime(): ExtensionRuntime | null {
  const w = window as unknown as { chrome?: { runtime?: ExtensionRuntime } };
  return typeof w.chrome?.runtime?.sendMessage === "function" ? w.chrome.runtime : null;
}

type Phase = "idle" | "busy" | "done" | "error";

export default function ConnectExtension({ extensionId, email }: { extensionId: string; email: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  const fail = (msg: string) => { setError(msg); setPhase("error"); };

  const connect = async () => {
    const runtime = extensionRuntime();
    if (!runtime) return fail("The TrackMyself extension isn't reachable from this browser. Open this page from the extension.");

    setPhase("busy");
    setError("");

    const res = await fetch("/api/extension/token", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return fail(data.error ?? "Could not create an extension session.");

    runtime.sendMessage(extensionId, { type: "TM_CONNECT", ...data }, (reply) => {
      if (runtime.lastError || !reply?.ok) {
        return fail("The extension did not accept the sign-in. Reload it and try again.");
      }
      setPhase("done");
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={36} textSize="text-lg" lit />
        </div>

        <div className="surface rounded-xl border p-6">
          <h1 className="text-2xl font-semibold">Connect the extension</h1>

          {!extensionId ? (
            <p className="text-muted mt-2 text-sm">
              This link is missing the extension&apos;s ID. Open it from the TrackMyself extension&apos;s sign-in panel.
            </p>
          ) : phase === "done" ? (
            <p className="text-muted mt-2 text-sm">
              The extension is signed in as <span className="text-primary font-medium">{email}</span>. You can close this tab.
            </p>
          ) : (
            <>
              <p className="text-muted mt-2 text-sm">
                Sign the TrackMyself browser extension in as{" "}
                <span className="text-primary font-medium">{email}</span>? It will be able to save jobs to your tracker for 7 days.
              </p>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
              <button
                type="button"
                onClick={connect}
                disabled={phase === "busy"}
                className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {phase === "busy" && <Spinner />}
                Connect extension
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
