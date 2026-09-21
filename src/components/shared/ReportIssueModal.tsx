"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { ISSUE_CATEGORIES, ISSUE_MESSAGE_MAX, type IssueCategory } from "@/constants/issues";

export default function ReportIssueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [category, setCategory] = useState<IssueCategory>("Bug");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError("");

    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        message,
        url: window.location.pathname + window.location.search,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      }),
    }).catch(() => null);

    setSaving(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Could not send the report. Try again.");
      return;
    }

    setSent(true);
  };

  return (
    <Modal open={open} onClose={onClose} title="Report an issue">
      {sent ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 size={34} className="text-emerald-500" aria-hidden="true" />
          <p className="font-medium">Thanks — your report is in.</p>
          <p className="text-muted text-sm">
            You can follow its status under Reported issues on your overview.
          </p>
          <button type="button" onClick={onClose} className="btn-primary mt-2 rounded-lg px-4 py-2 text-sm">
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="issue-category" className="mb-1.5 block text-sm font-medium">
              What kind of issue?
            </label>
            <select
              id="issue-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="surface-muted w-full rounded-lg border px-3 py-2 text-sm"
            >
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="issue-message" className="mb-1.5 block text-sm font-medium">
              What happened?
            </label>
            <textarea
              id="issue-message"
              rows={5}
              value={message}
              maxLength={ISSUE_MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you expected and what happened instead."
              className="surface-muted w-full resize-y rounded-lg border px-3 py-2 text-sm"
            />
            <p className="text-muted mt-1 text-xs">
              {message.length}/{ISSUE_MESSAGE_MAX} · the page address and your browser are attached automatically.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="surface-muted rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || message.trim().length < 8}
              className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "Sending…" : "Send report"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
