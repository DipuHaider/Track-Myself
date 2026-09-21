"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellOff, CheckCheck, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications/types";

const TYPE_LABELS: Record<NotificationType, string> = {
  ghost: "Ghost listings",
  duplicate: "Duplicates",
  interview: "Interviews",
  todo: "To-dos",
  "issue-update": "Issue updates",
  "issue-new": "New reports",
  account: "Account",
  "ai-key": "AI key",
};

type Filter = "all" | "unread" | NotificationType;

export default function NotificationsList() {
  const { items, unread, loading, markRead, markAllRead, dismiss } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const present = useMemo(
    () => NOTIFICATION_TYPES.filter((t) => items.some((i) => i.type === t)),
    [items],
  );

  const shown = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((i) => !i.read);
    return items.filter((i) => i.type === filter);
  }, [items, filter]);

  return (
    <section className="surface rounded-xl border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`notif-filter ${filter === "all" ? "is-active" : ""}`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            aria-pressed={filter === "unread"}
            className={`notif-filter ${filter === "unread" ? "is-active" : ""}`}
          >
            Unread ({unread})
          </button>
          {present.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              aria-pressed={filter === t}
              className={`notif-filter ${filter === t ? "is-active" : ""}`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {unread > 0 && (
          <button type="button" onClick={markAllRead} className="notif-action">
            <CheckCheck size={13} aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>

      {loading && <p className="text-muted text-sm">Loading…</p>}

      {!loading && !shown.length && (
        <div className="notif-empty">
          <BellOff size={22} aria-hidden="true" />
          <p className="text-sm">Nothing here.</p>
          <p className="text-muted text-xs">
            When an application goes quiet for 45 days or an interview is coming up, it appears
            here automatically.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {shown.map((item) => (
          <li key={item.id} className="notif-row" data-unread={!item.read}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{item.title}</span>
                <span className="notif-chip">{TYPE_LABELS[item.type]}</span>
                {!item.read && <span className="notif-dot" aria-label="Unread" />}
              </div>
              <p className="text-muted mt-0.5 text-sm">{item.body}</p>
              <p className="text-muted mt-1 text-xs">
                {new Date(item.createdAt).toLocaleString()}
                {item.href && (
                  <>
                    {" · "}
                    <Link
                      href={item.href}
                      onClick={() => !item.read && markRead([item.id])}
                      className="text-[var(--primary)]"
                    >
                      Open
                    </Link>
                  </>
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!item.read && (
                <button
                  type="button"
                  onClick={() => markRead([item.id])}
                  className="notif-action"
                  aria-label={`Mark "${item.title}" read`}
                >
                  <CheckCheck size={13} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="notif-dismiss"
                aria-label={`Dismiss "${item.title}"`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
