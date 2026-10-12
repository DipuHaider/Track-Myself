"use client";

import { useCallback, useEffect, useRef } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api/client";
import { NOTIFICATION_EVENT, type NotificationItem } from "@/lib/notifications/types";

const POLL_MS = 60000;
const CHANNEL = "tm-notifications";
export const NOTIFICATIONS_KEY = "/api/notifications";

type Payload = { items: NotificationItem[]; unread: number };

function broadcast() {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(Date.now());
    channel.close();
  } catch {}
}

export function refreshNotifications() {
  return globalMutate(NOTIFICATIONS_KEY);
}

/* One SWR key shared by the bell, the list page and the toaster, so a page
   with all three mounted polls once a minute, not three times. Tabs stay in
   step over a BroadcastChannel that just revalidates the key. */
export function useNotifications() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const known = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const { data, isLoading, mutate } = useSWR<Payload>(signedIn ? NOTIFICATIONS_KEY : null, {
    refreshInterval: POLL_MS,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
    onSuccess: (payload) => {
      const fresh = payload.items.filter((i) => !i.read && !known.current.has(i.id));
      for (const i of payload.items) known.current.add(i.id);
      if (primed.current && fresh.length) {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: fresh }));
      }
      primed.current = true;
    },
  });

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => mutate();
    } catch {}
    return () => channel?.close();
  }, [mutate]);

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      await mutate(
        async (current) => {
          await apiFetch("/api/notifications/read", { method: "POST", json: { ids } }).catch(() => {});
          if (!current) return current;
          const items = current.items.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i));
          return { items, unread: items.filter((i) => !i.read).length };
        },
        {
          optimisticData: (current) => {
            if (!current) return { items: [], unread: 0 };
            const items = current.items.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i));
            return { items, unread: items.filter((i) => !i.read).length };
          },
          revalidate: false,
          rollbackOnError: true,
        },
      );
      broadcast();
    },
    [mutate],
  );

  const markAllRead = useCallback(async () => {
    await mutate(
      async (current) => {
        await apiFetch("/api/notifications/read", { method: "POST", json: { all: true } }).catch(() => {});
        return current ? { items: current.items.map((i) => ({ ...i, read: true })), unread: 0 } : current;
      },
      {
        optimisticData: (current) => ({ items: (current?.items ?? []).map((i) => ({ ...i, read: true })), unread: 0 }),
        revalidate: false,
        rollbackOnError: true,
      },
    );
    broadcast();
  }, [mutate]);

  const dismiss = useCallback(
    async (id: string) => {
      await mutate(
        async (current) => {
          await apiFetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
          if (!current) return current;
          const items = current.items.filter((i) => i.id !== id);
          return { items, unread: items.filter((i) => !i.read).length };
        },
        {
          optimisticData: (current) => {
            const items = (current?.items ?? []).filter((i) => i.id !== id);
            return { items, unread: items.filter((i) => !i.read).length };
          },
          revalidate: false,
          rollbackOnError: true,
        },
      );
      broadcast();
    },
    [mutate],
  );

  return { items, unread, loading: signedIn && isLoading, signedIn, load: mutate, markRead, markAllRead, dismiss };
}
