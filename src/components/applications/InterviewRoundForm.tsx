"use client";

import { useId, useState } from "react";
import { INTERVIEW_STAGES, INTERVIEW_STATUSES, type InterviewStatus } from "@/schemas/interviewSchema";
import type { Interview, InterviewInput } from "@/types/interview";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const FIELD = "surface w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]";

export default function InterviewRoundForm({
  initial,
  busy = false,
  submitLabel = "Add round",
  onSubmit,
  onCancel,
}: {
  initial?: Interview;
  busy?: boolean;
  submitLabel?: string;
  onSubmit: (input: InterviewInput) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [stageName, setStageName] = useState(initial?.stageName ?? "");
  const [status, setStatus] = useState<InterviewStatus>(initial?.status ?? "Scheduled");
  const [scheduled, setScheduled] = useState(toLocalInput(initial?.scheduledDate));
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stage = stageName.trim();
    if (!stage) { setError("Give the round a stage name."); return; }
    setError("");
    await onSubmit({
      stageName: stage,
      status,
      scheduledDate: fromLocalInput(scheduled),
      feedback: feedback.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="surface-muted space-y-2.5 rounded-lg p-3" aria-busy={busy}>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label htmlFor={`${id}-stage`} className="text-muted mb-1 block text-xs font-medium">Stage</label>
          <input
            id={`${id}-stage`}
            list={`${id}-stages`}
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="e.g. Technical"
            maxLength={120}
            required
            className={FIELD}
          />
          <datalist id={`${id}-stages`}>
            {INTERVIEW_STAGES.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor={`${id}-when`} className="text-muted mb-1 block text-xs font-medium">When</label>
          <input
            id={`${id}-when`}
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor={`${id}-status`} className="text-muted mb-1 block text-xs font-medium">Status</label>
          <select
            id={`${id}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as InterviewStatus)}
            className={FIELD}
          >
            {INTERVIEW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor={`${id}-feedback`} className="text-muted mb-1 block text-xs font-medium">Feedback</label>
          <textarea
            id={`${id}-feedback`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="What they said, how it went…"
            className={FIELD}
          />
        </div>
        <div className="col-span-2">
          <label htmlFor={`${id}-notes`} className="text-muted mb-1 block text-xs font-medium">Notes</label>
          <textarea
            id={`${id}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Prep, who you met, follow-ups…"
            className={FIELD}
          />
        </div>
      </div>
      {error && <p className="text-danger text-xs" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary rounded-md px-3 py-1.5 text-xs">
            Cancel
          </button>
        )}
        <button type="submit" disabled={busy} className="btn-primary rounded-md px-3 py-1.5 text-xs">
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
