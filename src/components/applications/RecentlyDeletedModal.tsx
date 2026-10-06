"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import Modal from "@/components/shared/Modal";
import StatusBadge from "@/components/applications/StatusBadge";

export type DeletedItem = {
  _id: string;
  companyName: string;
  jobTitle: string;
  applicationStatus: string;
  deletedAt: string;
  deletedByName?: string;
  purgeAt: string;
  owner?: { name: string; email: string } | null;
};

function daysLeft(purgeAt: string) {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / 86_400_000));
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function RecentlyDeletedModal<T>({
  open,
  onClose,
  endpoint,
  showOwner = false,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  endpoint: string;
  showOwner?: boolean;
  onRestored: (app: T) => void;
}) {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { days: number; items: DeletedItem[] }) => {
        if (!alive) return;
        setItems(data.items);
        setDays(data.days);
      })
      .catch(() => { if (alive) setError("Could not load recently deleted applications."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [endpoint]);

  const restore = async (item: DeletedItem) => {
    setBusyId(item._id);
    setError("");
    const res = await fetch(`${endpoint}/${item._id}`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) { setError("Could not restore that application."); return; }
    onRestored((await res.json()) as T);
    setItems((prev) => prev.filter((i) => i._id !== item._id));
  };

  const deleteForever = async (item: DeletedItem) => {
    if (!confirm(`Permanently delete "${item.jobTitle}" at ${item.companyName}? This cannot be undone.`)) return;
    setBusyId(item._id);
    setError("");
    const res = await fetch(`${endpoint}/${item._id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) { setError("Could not delete that application."); return; }
    setItems((prev) => prev.filter((i) => i._id !== item._id));
  };

  return (
    <Modal open={open} onClose={onClose} title="Recently deleted" size={showOwner ? "xl" : "md"}>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        <p className="text-muted mb-3 text-xs">
          Deleted applications are kept for {days} days, then removed for good together with their
          interviews and reminders.
        </p>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        {loading ? (
          <p className="text-muted py-6 text-center text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted py-6 text-center text-sm">Nothing here.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {items.map((item) => {
              const left = daysLeft(item.purgeAt);
              return (
                <li key={item._id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.companyName} <span className="text-muted font-normal">· {item.jobTitle}</span>
                    </p>
                    <p className="text-muted mt-0.5 text-xs">
                      {showOwner && item.owner && <>Owner: {item.owner.name} · </>}
                      Deleted {formatDate(item.deletedAt)}
                      {item.deletedByName && <> by {item.deletedByName}</>}
                      {" · "}
                      <span className={left <= 3 ? "text-red-500" : ""}>
                        {left === 0 ? "removed today" : `${left} day${left === 1 ? "" : "s"} left`}
                      </span>
                    </p>
                  </div>
                  <StatusBadge status={item.applicationStatus} />
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => restore(item)}
                      disabled={busyId === item._id}
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteForever(item)}
                      disabled={busyId === item._id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-2.5 py-1 text-xs text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Delete forever
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
