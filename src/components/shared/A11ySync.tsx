"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { applyA11y, normaliseA11y } from "@/lib/a11y";
import { fetcher } from "@/lib/api/client";

/* Pulls the account's saved accessibility preferences once per sign-in and
   applies them, so "saved to your account" is true on a fresh device rather
   than only after the settings modal has been opened. */
export default function A11ySync() {
  const { status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || done.current) return;
    done.current = true;
    fetcher<unknown>("/api/user/preferences")
      .then((remote) => {
        if (!remote || typeof remote !== "object") return;
        applyA11y(normaliseA11y(remote));
      })
      .catch(() => {});
  }, [status]);

  return null;
}
