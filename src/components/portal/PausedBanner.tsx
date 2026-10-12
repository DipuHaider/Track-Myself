"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { PauseCircle } from "lucide-react";

export default function PausedBanner() {
  const { data: session } = useSession();
  if (session?.user?.status !== "paused") return null;

  return (
    <div role="status" className="alert alert-warning anim-in mb-5 flex-wrap items-center">
      <PauseCircle size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        Your account is paused — adding and editing applications is frozen. Everything you saved is
        still here.
      </span>
      <Link href="/me/settings?tab=data" className="font-semibold underline underline-offset-2">
        Resume
      </Link>
    </div>
  );
}
