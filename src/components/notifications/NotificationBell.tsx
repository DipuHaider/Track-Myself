"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, BellOff, Briefcase, CalendarClock, CheckCheck, Copy,
  Ghost, KeyRound, LifeBuoy, ListTodo, UserCog, X,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationType } from "@/lib/notifications/types";

const ICONS: Record<NotificationType, React.ReactNode> = {
  ghost: <Ghost size={14} aria-hidden="true" />,
  duplicate: <Copy size={14} aria-hidden="true" />,
  interview: <CalendarClock size={14} aria-hidden="true" />,
  todo: <ListTodo size={14} aria-hidden="true" />,
  "issue-update": <LifeBuoy size={14} aria-hidden="true" />,
  "issue-new": <Briefcase size={14} aria-hidden="true" />,
  account: <UserCog size={14} aria-hidden="true" />,
  "ai-key": <KeyRound size={14} aria-hidden="true" />,
};

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const { items, unread, signedIn, markRead, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Element)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (id: string, href: string, read: boolean) => {
    if (!read) markRead([id]);
    setOpen(false);
    if (href) router.push(href);
  };

  const visible = items.slice(0, 8);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (signedIn ? setOpen((v) => !v) : router.push("/login"))}
        className="notif-trigger"
        aria-label={signedIn ? `Notifications${unread ? `, ${unread} unread` : ""}` : "Sign in to see notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell size={17} aria-hidden="true" />
        {signedIn && unread > 0 && (
          <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && signedIn && (
        <div className="notif-panel anim-panel" role="menu">
          <div className="notif-head">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="notif-action">
                <CheckCheck size={13} aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {!visible.length && (
              <div className="notif-empty">
                <BellOff size={20} aria-hidden="true" />
                <p className="text-sm">You&apos;re all caught up.</p>
                <p className="text-muted text-xs">
                  Ghost listings, duplicates, interviews and to-dos show up here.
                </p>
              </div>
            )}

            {visible.map((item) => (
              <div key={item.id} className="notif-item" data-unread={!item.read}>
                <span className="notif-icon">{ICONS[item.type]}</span>

                <button
                  type="button"
                  className="notif-body"
                  onClick={() => openItem(item.id, item.href, item.read)}
                >
                  <span className="notif-title">{item.title}</span>
                  <span className="notif-text">{item.body}</span>
                  <span className="notif-time">{ago(item.createdAt)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="notif-dismiss"
                  aria-label={`Dismiss "${item.title}"`}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <Link href="/me/notifications" onClick={() => setOpen(false)} className="notif-foot">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
