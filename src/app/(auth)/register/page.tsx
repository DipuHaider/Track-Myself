"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    if (response.ok) {
      router.push("/login");
      return;
    }

    let payload: { error?: string | object } = {};
    try {
      payload = await response.json();
    } catch {
      // empty or non-JSON body
    }

    const msg = typeof payload.error === "string" ? payload.error : "Registration failed. Please try again.";
    setError(msg);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/redirect" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="surface w-full max-w-md rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Register</h1>
        <p className="text-muted mt-1 text-sm">Create an account to start tracking jobs.</p>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
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
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Password"
            type="password"
            value={formData.password}
            onChange={(e) => onChange("password", e.target.value)}
            required
          />
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary mt-4 w-full rounded-md px-3 py-2 disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-muted mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
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
