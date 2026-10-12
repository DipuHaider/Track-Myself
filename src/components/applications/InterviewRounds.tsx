"use client";

import { useId, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarClock, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import InterviewRoundForm from "@/components/applications/InterviewRoundForm";
import { useInterviews } from "@/hooks/useInterviews";
import type { Interview, InterviewInput } from "@/types/interview";

export const INTERVIEW_STATUS_CLASS: Record<string, string> = {
  Scheduled: "status-interview",
  Completed: "status-offer",
  Cancelled: "status-rejected",
};

function formatWhen(iso: string | null) {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function isOverdue(round: Interview, now: number) {
  return (round.status ?? "Scheduled") === "Scheduled" && !!round.scheduledDate && new Date(round.scheduledDate).getTime() < now;
}

export default function InterviewRounds({
  applicationId,
  defaultOpen = false,
}: {
  applicationId: string;
  defaultOpen?: boolean;
}) {
  const { data: session } = useSession();
  const paused = session?.user?.status === "paused";
  const { interviews, loading, error, add, update, remove } = useInterviews(applicationId);
  const confirm = useConfirm();
  const panelId = useId();

  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const handleAdd = async (input: InterviewInput) => {
    setBusy(true);
    try {
      await add(input);
      setAdding(false);
      toast.success("Interview round added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that round.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id: string, input: InterviewInput) => {
    setBusy(true);
    try {
      await update(id, input);
      setEditingId(null);
      toast.success("Interview round updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update that round.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (round: Interview) => {
    const ok = await confirm({
      title: "Delete this interview round?",
      message: `"${round.stageName}" will be removed from this application.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove(round._id);
      toast.success("Interview round deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that round.");
    }
  };

  const count = interviews.length;

  return (
    <section className="mb-5 border-b pb-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-muted inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
          <CalendarClock size={13} aria-hidden="true" /> Interviews
          {count > 0 && <span className="role-badge status-interview px-1.5 py-0 text-[10px]">{count}</span>}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="mt-3 space-y-3">
          {loading && (
            <div role="status" aria-live="polite" className="space-y-2">
              <span className="sr-only">Loading interviews</span>
              {[0, 1].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-[var(--surface-2)]" />)}
            </div>
          )}
          {error && !loading && <p className="text-danger text-xs">{error.message}</p>}

          {!loading && !error && count === 0 && !adding && (
            <p className="text-muted text-xs">No interview rounds yet.</p>
          )}

          <ul className="space-y-2">
            {interviews.map((round) =>
              editingId === round._id ? (
                <li key={round._id}>
                  <InterviewRoundForm
                    initial={round}
                    busy={busy}
                    submitLabel="Save"
                    onSubmit={(input) => handleUpdate(round._id, input)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={round._id} className="surface-muted rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium leading-tight">
                        {round.stageName}
                        <span className={`role-badge ${INTERVIEW_STATUS_CLASS[round.status ?? "Scheduled"] ?? "status-wishlist"} px-1.5 py-0 text-[10px]`}>
                          {round.status ?? "Scheduled"}
                        </span>
                      </p>
                      <p className={`mt-0.5 text-xs ${isOverdue(round, now) ? "text-warning" : "text-muted"}`}>
                        {formatWhen(round.scheduledDate)}
                        {isOverdue(round, now) && " · past date, still scheduled"}
                      </p>
                      {round.feedback && <p className="mt-1 text-xs italic">&ldquo;{round.feedback}&rdquo;</p>}
                      {round.notes && <p className="text-muted mt-1 whitespace-pre-wrap text-xs">{round.notes}</p>}
                    </div>
                    {!paused && (
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => { setAdding(false); setEditingId(round._id); }}
                          aria-label={`Edit ${round.stageName}`}
                          title="Edit"
                          className="text-muted rounded-md p-1 transition hover:bg-[var(--surface)] hover:text-primary"
                        >
                          <Pencil size={13} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(round)}
                          aria-label={`Delete ${round.stageName}`}
                          title="Delete"
                          className="text-muted rounded-md p-1 transition hover:bg-[var(--surface)] hover:text-[var(--danger)]"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>

          {paused ? (
            <p className="text-muted text-xs">Your account is paused, so interview rounds are read-only.</p>
          ) : adding ? (
            <InterviewRoundForm busy={busy} onSubmit={handleAdd} onCancel={() => setAdding(false)} />
          ) : (
            <button
              type="button"
              onClick={() => { setEditingId(null); setAdding(true); }}
              className="btn-secondary inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs"
            >
              <Plus size={13} aria-hidden="true" /> Add round
            </button>
          )}
        </div>
      )}
    </section>
  );
}
