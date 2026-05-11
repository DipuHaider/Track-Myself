"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role === "admin" || role === "editor") {
      router.replace("/dashboard");
    } else {
      router.replace("/me");
    }
  }, [session, status, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted text-sm">Redirecting…</p>
    </main>
  );
}
