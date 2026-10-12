"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, Loader2, MailWarning, XCircle } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Spinner } from "@/components/shared/Spinner";
import { useResendVerification } from "@/components/auth/CheckInbox";
import { apiFetch, ApiError } from "@/lib/api/client";

type State =
  | { kind: "missing" }
  | { kind: "verifying" }
  | { kind: "verified"; email: string; alreadyVerified: boolean }
  | { kind: "failed"; reason: "invalid" | "expired" | "used" | "error"; error: string };

function ResendForm({ reason }: { reason: string }) {
  const [email, setEmail] = useState("");
  const { resend, busy, left, note, canSend } = useResendVerification();
  const id = useId();

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); resend(email.trim()); }}
      className="mt-5 space-y-3 text-left"
    >
      <label htmlFor={id} className="block text-sm font-medium">
        {reason === "used" ? "Need a fresh link anyway? Enter your email" : "Enter your email for a new link"}
      </label>
      <input
        id={id}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full rounded-md border px-3 py-2 text-sm"
        required
      />
      <button
        type="submit"
        disabled={!canSend || !email.trim()}
        className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm disabled:opacity-60"
      >
        {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {left > 0 ? `Resend available in ${left}s` : "Send a new verification email"}
      </button>
      <p aria-live="polite" className={`min-h-[1.25rem] text-sm ${note?.tone === "error" ? "text-danger" : "text-success"}`}>
        {note?.text ?? ""}
      </p>
    </form>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { status } = useSession();
  const [state, setState] = useState<State>(token ? { kind: "verifying" } : { kind: "missing" });
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!token || started.current === token) return;
    started.current = token;
    let alive = true;
    apiFetch<{ ok: true; email: string; alreadyVerified: boolean }>("/api/auth/verify-email", {
      method: "POST",
      json: { token },
    })
      .then((res) => { if (alive) setState({ kind: "verified", email: res.email, alreadyVerified: res.alreadyVerified }); })
      .catch((err) => {
        if (!alive) return;
        const body = err instanceof ApiError ? (err.body as { reason?: string; error?: string } | null) : null;
        const reason = body?.reason === "expired" || body?.reason === "used" || body?.reason === "invalid" ? body.reason : "error";
        setState({ kind: "failed", reason, error: err instanceof ApiError ? err.message : "Could not verify that link." });
      });
    return () => { alive = false; };
  }, [token]);

  const continueHref = status === "authenticated" ? "/me" : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={36} textSize="text-lg" lit />
        </div>

        <div className="surface w-full rounded-xl border p-6 text-center" aria-live="polite">
          {state.kind === "verifying" && (
            <>
              <Spinner size={26} label="Verifying your email" />
              <h1 className="mt-4 text-xl font-semibold">Verifying your email…</h1>
              <p className="text-muted mt-1 text-sm">This only takes a moment.</p>
            </>
          )}

          {state.kind === "verified" && (
            <>
              <div className="alert alert-success text-left">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">{state.alreadyVerified ? "Already verified" : "Email verified"}</p>
                  <p className="mt-0.5 text-xs opacity-90">
                    {state.email} is confirmed. {status === "authenticated" ? "You are all set." : "You can sign in now."}
                  </p>
                </div>
              </div>
              <Link href={continueHref} className="btn-primary mt-5 inline-block rounded-md px-5 py-2 text-sm font-medium">
                Continue
              </Link>
            </>
          )}

          {state.kind === "failed" && (
            <>
              <div className="alert alert-danger text-left">
                <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {state.reason === "expired" ? "This link has expired" : state.reason === "used" ? "This link was already used" : "This link is not valid"}
                  </p>
                  <p className="mt-0.5 text-xs opacity-90">{state.error}</p>
                </div>
              </div>
              {state.reason === "used" ? (
                <p className="text-muted mt-4 text-sm">
                  If you have already verified, just{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">sign in</Link>.
                </p>
              ) : null}
              <ResendForm reason={state.reason} />
            </>
          )}

          {state.kind === "missing" && (
            <>
              <span className="icon-chip alert-warning mx-auto mb-3" style={{ width: "3rem", height: "3rem" }}>
                <MailWarning size={22} aria-hidden="true" />
              </span>
              <h1 className="text-xl font-semibold">No verification link</h1>
              <p className="text-muted mt-1 text-sm">
                Open the link from your verification email, or request a new one below.
              </p>
              <ResendForm reason="invalid" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center p-6"><Spinner size={22} label="Loading" /></main>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
