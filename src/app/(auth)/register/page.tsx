"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const payload = (await response.json()) as { error?: string };
    setError(payload.error ?? "Registration failed");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="surface w-full max-w-md rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Register</h1>
        <p className="text-muted mt-1 text-sm">Create an account to start tracking jobs.</p>

        <div className="mt-4 space-y-3">
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
