"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function SessionWatcher() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const callbackUrl = `/login?expired=1&from=${encodeURIComponent(pathname)}`;
    signOut({ redirect: false }).finally(() => router.replace(callbackUrl));
  }, [status, pathname, router]);

  return null;
}
