"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Check, Circle, Compass, Puzzle, X } from "lucide-react";
import { useApplicationStats } from "@/hooks/useApplicationStats";
import { useCVProfile } from "@/hooks/useCVProfile";
import { useTourState } from "@/hooks/useTourState";
import { TOUR_EVENT } from "@/lib/tour";

function readFlag(key: string): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

type Item = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  href?: string;
  onClick?: () => void;
};

export default function GettingStarted({ userId }: { userId: string }) {
  const storageKey = `tm-getting-started:${userId}`;
  const extKey = `${storageKey}:extension`;
  const { stats, paused } = useApplicationStats();
  const { profile } = useCVProfile();
  const { state: tour } = useTourState();
  const { data: todos } = useSWR<unknown[]>("/api/user/todos", { revalidateOnFocus: false });

  /* Read lazily rather than in an effect. The section renders nothing until
     stats arrive, which never happens during server rendering, so there is no
     markup to mismatch on hydration. */
  const [dismissed, setDismissed] = useState(() => readFlag(storageKey));
  const [extDone, setExtDone] = useState(() => readFlag(extKey));

  if (dismissed || paused || !stats) return null;

  const items: Item[] = [
    { key: "app", label: "Add your first application", hint: "Start with the last job you applied to.", done: stats.total > 0, href: "/me/applications" },
    { key: "cv", label: "Upload a CV", hint: "Used for tailoring and the document generator.", done: profile.uploadedFiles.length > 0, href: "/me/my-cv" },
    { key: "todo", label: "Set a follow-up or to-do", hint: "So nothing slips after you apply.", done: (todos?.length ?? 0) > 0, href: "/me/todos" },
    {
      key: "tour", label: "Take the tour", hint: "A two-minute walk through the portal.",
      done: tour?.seen.includes("portal") ?? false,
      onClick: () => window.dispatchEvent(new Event(TOUR_EVENT)),
    },
    {
      key: "ext", label: "Install the extension", hint: "Save postings straight from the browser.",
      done: extDone, href: "/extension/connect",
      onClick: () => { try { localStorage.setItem(extKey, "1"); } catch {} setExtDone(true); },
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  if (stats.total > 0 && doneCount === items.length) return null;

  const dismiss = () => {
    try { localStorage.setItem(storageKey, "1"); } catch {}
    setDismissed(true);
  };

  return (
    <section className="surface rounded-xl border p-5" aria-labelledby="getting-started-title">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 id="getting-started-title" className="font-semibold">Getting started</h2>
          <p className="text-muted text-xs">{doneCount} of {items.length} done</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss getting started"
          className="text-muted rounded-md p-1 transition hover:bg-[var(--surface-2)]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <ol className="space-y-2">
        {items.map((item) => {
          const icon = item.done
            ? <span className="icon-chip status-offer h-6 w-6"><Check size={12} aria-hidden="true" /></span>
            : <span className="icon-chip status-wishlist h-6 w-6"><Circle size={12} aria-hidden="true" /></span>;
          const body = (
            <>
              {icon}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${item.done ? "text-muted line-through" : "font-medium"}`}>{item.label}</span>
                {!item.done && <span className="text-muted block text-xs">{item.hint}</span>}
              </span>
              {item.key === "tour" && !item.done && <Compass size={14} className="text-muted" aria-hidden="true" />}
              {item.key === "ext" && !item.done && <Puzzle size={14} className="text-muted" aria-hidden="true" />}
            </>
          );
          const cls = "flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--surface-2)]";
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} onClick={item.onClick} className={cls} aria-label={item.done ? `${item.label} (done)` : item.label}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={item.onClick} className={`${cls} w-full text-left`} aria-label={item.done ? `${item.label} (done)` : item.label}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
