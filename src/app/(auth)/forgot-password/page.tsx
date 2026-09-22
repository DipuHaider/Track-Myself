"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Spinner } from "@/components/shared/Spinner";
import { Logo } from "@/components/shared/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    setIsSubmitting(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Could not send the reset email. Try again.");
      return;
    }

    setSent(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={36} textSize="text-lg" lit />
        </div>

        {sent ? (
          <div className="surface w-full rounded-xl border p-6 text-center">
            <MailCheck size={30} className="mx-auto text-emerald-500" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-semibold">Check your inbox</h1>
            <p className="text-muted mt-2 text-sm">
              If that address has an account, a reset link is on its way. It works once and
              expires in 30 minutes.
            </p>
            <Link
              href="/login"
              className="text-primary mt-5 inline-block text-sm font-medium hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="surface w-full rounded-xl border p-6">
            <h1 className="text-2xl font-semibold">Forgot your password?</h1>
            <p className="text-muted mt-1 text-sm">
              Enter your email and we&apos;ll send you a link to choose a new one.
            </p>

            <input
              className="mt-5 w-full rounded-md border px-3 py-2"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary mt-4 w-full rounded-md px-3 py-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Spinner size={17} label="Sending reset link" />
                </span>
              ) : "Send reset link"}
            </button>

            <p className="text-muted mt-4 text-center text-sm">
              Remembered it?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
