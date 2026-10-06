"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NOTIFICATION_EVENT, type NotificationItem } from "@/lib/notifications/types";

const LIFETIME_MS = 6500;
const MAX_VISIBLE = 3;

export default function NotificationToasts() {
  const router = useRouter();

  useEffect(() => {
    const onArrive = (e: Event) => {
      const fresh = (e as CustomEvent<NotificationItem[]>).detail;
      if (!Array.isArray(fresh) || !fresh.length) return;
      for (const item of fresh.slice(0, MAX_VISIBLE)) {
        toast(item.title, {
          id: item.id,
          description: item.body,
          duration: LIFETIME_MS,
          action: item.href ? { label: "Open", onClick: () => router.push(item.href) } : undefined,
        });
      }
    };

    window.addEventListener(NOTIFICATION_EVENT, onArrive);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onArrive);
  }, [router]);

  return null;
}
