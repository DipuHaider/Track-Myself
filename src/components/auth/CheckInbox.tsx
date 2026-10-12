"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";

export function useResendVerification(cooldownSeconds = 60) {
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  const resend = async (email: string) => {
    if (busy || left > 0 || !email) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/auth/resend-verification", {
        method: "POST",
        json: { email },
      });
      setNote({ text: res.message, tone: "success" });
      setLeft(cooldownSeconds);
    } catch (err) {
      setNote({
        text: err instanceof ApiError ? err.message : "Could not send the email. Try again.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return { resend, busy, left, note, canSend: !busy && left === 0 };
}

export function ResendButton({
  email, className = "btn-secondary rounded-md px-3 py-1.5 text-xs font-medium", label = "Resend verification email",
}: { email: string; className?: string; label?: string }) {
  const { resend, busy, left, note, canSend } = useResendVerification();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={() => resend(email)} disabled={!canSend} className={`${className} inline-flex items-center gap-1.5 disabled:opacity-60`}>
        {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
        {left > 0 ? `Resend in ${left}s` : label}
      </button>
      <span aria-live="polite" className={`text-xs ${note?.tone === "error" ? "text-danger" : "text-success"}`}>
        {note?.text ?? ""}
      </span>
    </span>
  );
}

export default function CheckInbox({ email }: { email: string }) {
  const { resend, busy, left, note, canSend } = useResendVerification();

  return (
    <div className="surface w-full rounded-xl border p-6 text-center">
      <span className="icon-chip alert-success mx-auto mb-4" style={{ width: "3rem", height: "3rem" }}>
        <MailCheck size={22} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-semibold">Check your inbox</h1>
      <p className="text-muted mt-2 text-sm">
        We sent a verification link to <span className="font-medium text-[var(--foreground)]">{email}</span>.
        Open it to activate your account — the link is valid for a limited time.
      </p>
      <p className="text-muted mt-3 text-xs">
        Nothing there? Check your spam folder, then request a new one.
      </p>

      <button
        type="button"
        onClick={() => resend(email)}
        disabled={!canSend}
        className="btn-secondary mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
        {left > 0 ? `Resend available in ${left}s` : "Resend the email"}
      </button>

      <p aria-live="polite" className={`mt-3 min-h-[1.25rem] text-sm ${note?.tone === "error" ? "text-danger" : "text-success"}`}>
        {note?.text ?? ""}
      </p>

      <p className="text-muted mt-4 text-sm">
        Already verified?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
