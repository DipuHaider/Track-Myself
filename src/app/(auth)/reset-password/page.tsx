"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, LinkIcon } from "lucide-react";
import { Spinner } from "@/components/shared/Spinner";
import { Logo } from "@/components/shared/Logo";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setValid(Boolean(data?.valid)))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("The two passwords do not match");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    setIsSubmitting(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Could not reset the password. Try again.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  };

  if (checking) {
    return (
      <div className="surface w-full rounded-xl border p-10 text-center">
        <Spinner size={22} label="Checking your reset link" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="surface w-full rounded-xl border p-6 text-center">
        <LinkIcon size={30} className="mx-auto text-amber-500" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-semibold">This link is no longer valid</h1>
        <p className="text-muted mt-2 text-sm">
          Reset links work once and expire after 30 minutes. Request a fresh one and it will
          arrive in a moment.
        </p>
        <Link
          href="/forgot-password"
          className="btn-primary mt-5 inline-block rounded-md px-4 py-2 text-sm"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="surface w-full rounded-xl border p-6 text-center">
        <CheckCircle2 size={30} className="mx-auto text-emerald-500" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-semibold">Password updated</h1>
        <p className="text-muted mt-2 text-sm">
          You have been signed out everywhere else. Taking you to sign in…
        </p>
        <Link
          href="/login"
          className="text-primary mt-5 inline-block text-sm font-medium hover:underline"
        >
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface w-full rounded-xl border p-6">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <p className="text-muted mt-1 text-sm">At least 8 characters.</p>

      <div className="mt-5 space-y-3">
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary mt-4 w-full rounded-md px-3 py-2 disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <Spinner size={17} label="Updating password" />
          </span>
        ) : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={36} textSize="text-lg" lit />
        </div>
        <Suspense
          fallback={
            <div className="surface w-full rounded-xl border p-10 text-center">
              <Spinner size={22} label="Loading" />
            </div>
          }
        >
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
