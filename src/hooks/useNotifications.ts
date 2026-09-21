"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { NOTIFICATION_EVENT, type NotificationItem } from "@/lib/notifications/types";

const POLL_MS = 60000;
const CHANNEL = "tm-notifications";

function broadcast() {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(Date.now());
    channel.close();
  } catch {}
}

export function useNotifications() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const known = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const load = useCallback(async () => {
    if (!signedIn) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/notifications").catch(() => null);
    if (!res || !res.ok) {
      setLoading(false);
      return;
    }

    const data = (await res.json().catch(() => null)) as
      | { items: NotificationItem[]; unread: number }
      | null;
    if (!data) {
      setLoading(false);
      return;
    }

    const fresh = data.items.filter((i) => !i.read && !known.current.has(i.id));
    for (const i of data.items) known.current.add(i.id);

    setItems(data.items);
    setUnread(data.unread);
    setLoading(false);

    if (primed.current && fresh.length) {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: fresh }));
    }
    primed.current = true;
  }, [signedIn]);

  useEffect(() => {
    queueMicrotask(load);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => load();
    } catch {}

    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      channel?.close();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      setItems((list) => list.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i)));
      setUnread((n) => Math.max(0, n - ids.length));
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }).catch(() => {});
      broadcast();
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((i) => ({ ...i, read: true })));
    setUnread(0);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    broadcast();
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setItems((list) => list.filter((i) => i.id !== id));
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    broadcast();
  }, []);

  return { items, unread, loading, signedIn, load, markRead, markAllRead, dismiss };
}
