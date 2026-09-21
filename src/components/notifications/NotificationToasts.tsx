"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { NOTIFICATION_EVENT, type NotificationItem } from "@/lib/notifications/types";

const LIFETIME_MS = 6500;
const MAX_VISIBLE = 3;

export default function NotificationToasts() {
  const router = useRouter();
  const [toasts, setToasts] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const onArrive = (e: Event) => {
      const fresh = (e as CustomEvent<NotificationItem[]>).detail;
      if (!Array.isArray(fresh) || !fresh.length) return;
      setToasts((list) => [...fresh, ...list].slice(0, MAX_VISIBLE));
    };

    window.addEventListener(NOTIFICATION_EVENT, onArrive);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onArrive);
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const id = window.setTimeout(() => setToasts((list) => list.slice(0, -1)), LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="notif-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="notif-toast anim-panel">
          <span className="notif-icon">
            <Bell size={14} aria-hidden="true" />
          </span>

          <button
            type="button"
            className="notif-body"
            onClick={() => {
              setToasts((list) => list.filter((t) => t.id !== toast.id));
              if (toast.href) router.push(toast.href);
            }}
          >
            <span className="notif-title">{toast.title}</span>
            <span className="notif-text">{toast.body}</span>
          </button>

          <button
            type="button"
            onClick={() => setToasts((list) => list.filter((t) => t.id !== toast.id))}
            className="notif-dismiss"
            aria-label="Dismiss"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
