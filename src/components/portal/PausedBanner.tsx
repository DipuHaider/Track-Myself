"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { PauseCircle } from "lucide-react";

export default function PausedBanner() {
  const { data: session } = useSession();
  if (session?.user?.status !== "paused") return null;

  return (
    <div
      role="status"
      className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
      style={{ borderColor: "#f59e0b66", background: "#fffbeb", color: "#92400e" }}
    >
      <PauseCircle size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        Your account is paused — adding and editing applications is frozen. Everything you saved is
        still here.
      </span>
      <Link href="/me" className="font-semibold underline underline-offset-2">
        Resume
      </Link>
    </div>
  );
}
