"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/shared/Spinner";
import { Logo } from "@/components/shared/Logo";
import CheckInbox from "@/components/auth/CheckInbox";
import { safeReturnTo } from "@/lib/safeReturnTo";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeReturnTo(params.get("next"));
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const onChange = (field: "name" | "email" | "password", value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setIsSubmitting(false);

    let payload: { error?: string | object; requiresVerification?: boolean; email?: string } = {};
    try {
      payload = await response.json();
    } catch {
      // empty or non-JSON body
    }

    if (response.ok) {
      if (payload.requiresVerification) {
        setPendingEmail(payload.email || formData.email.trim());
        return;
      }
      router.push(next === "/me" ? "/login" : `/login?from=${encodeURIComponent(next)}`);
      return;
    }

    const msg = typeof payload.error === "string" ? payload.error : "Registration failed. Please try again.";
    setError(msg);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: next });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={36} textSize="text-lg" lit />
        </div>

        {pendingEmail ? (
          <CheckInbox email={pendingEmail} />
        ) : (
        <form onSubmit={onSubmit} className="surface w-full rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Register</h1>
        <p className="text-muted mt-1 text-sm">Create an account to start tracking jobs.</p>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-60"
        >
          {googleLoading ? (
            <Spinner size={17} label="Redirecting to Google" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        <div className="my-4 flex items-center gap-3">
          <hr className="flex-1 border-[var(--border)]" />
          <span className="text-muted text-xs">or</span>
          <hr className="flex-1 border-[var(--border)]" />
        </div>

        <div className="space-y-3">
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Name"
            aria-label="Name"
            autoComplete="name"
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Password"
            aria-label="Password"
            autoComplete="new-password"
            type="password"
            value={formData.password}
            onChange={(e) => onChange("password", e.target.value)}
            required
          />
        </div>

        {error ? <p role="alert" className="text-danger mt-3 text-sm">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary mt-4 w-full rounded-md px-3 py-2 disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <Spinner size={17} label="Creating account" />
            </span>
          ) : "Create account"}
        </button>

        <p className="text-muted mt-4 text-center text-sm">
          Already have an account?{" "}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center p-6"><Spinner size={22} label="Loading" /></main>}>
      <RegisterForm />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.5 26.7 36.5 24 36.5c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
