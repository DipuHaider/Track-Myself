"use client";

import { useId, useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { ISSUE_CATEGORIES, ISSUE_MESSAGE_MAX, type IssueCategory } from "@/constants/issues";
import { announceIssueChange } from "@/lib/issueSync";
import { apiFetch, ApiError } from "@/lib/api/client";

export type IssueReportRow = { _id: string; category: string; status: string; createdAt: string };

export type ReportIssueModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  initialCategory?: IssueCategory;
  lockCategory?: boolean;
  initialMessage?: string;
  messageLabel?: string;
  placeholder?: string;
  submitLabel?: string;
  onSent?: (report: IssueReportRow) => void;
  renderSuccess?: (close: () => void) => ReactNode;
};

type FormProps = Required<Pick<ReportIssueModalProps, "onClose" | "initialCategory" | "lockCategory" | "initialMessage" | "messageLabel" | "placeholder" | "submitLabel">> &
  Pick<ReportIssueModalProps, "onSent" | "renderSuccess">;

/* Modal unmounts its children while closed, so this form's state starts fresh
   on every open without any synchronisation. */
function IssueForm({
  onClose, initialCategory, lockCategory, initialMessage, messageLabel, placeholder, submitLabel, onSent, renderSuccess,
}: FormProps) {
  const [category, setCategory] = useState<IssueCategory>(initialCategory);
  const [message, setMessage] = useState(initialMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const categoryId = useId();
  const messageId = useId();

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const report = await apiFetch<IssueReportRow>("/api/issues", {
        method: "POST",
        json: {
          category,
          message,
          botcheck: "",
          url: window.location.pathname + window.location.search,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      });
      setSent(true);
      announceIssueChange();
      onSent?.(report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the report. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    if (renderSuccess) return <>{renderSuccess(onClose)}</>;
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 size={34} className="text-success" aria-hidden="true" />
        <p className="font-medium">Thanks — your report is in.</p>
        <p className="text-muted text-sm">
          You can follow its status under My Reported Issues.
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-2 rounded-lg px-4 py-2 text-sm">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <label htmlFor={categoryId} className="mb-1.5 block text-sm font-medium">
          What kind of issue?
        </label>
        <select
          id={categoryId}
          value={category}
          disabled={lockCategory}
          onChange={(e) => setCategory(e.target.value as IssueCategory)}
          className="surface-muted w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-70"
        >
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={messageId} className="mb-1.5 block text-sm font-medium">
          {messageLabel}
        </label>
        <textarea
          id={messageId}
          rows={5}
          value={message}
          maxLength={ISSUE_MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          className="surface-muted w-full resize-y rounded-lg border px-3 py-2 text-sm"
        />
        <p className="text-muted mt-1 text-xs">
          {message.length}/{ISSUE_MESSAGE_MAX} · the page address and your browser are attached automatically.
        </p>
      </div>

      <input
        type="checkbox"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ display: "none" }}
      />

      {error && <p role="alert" className="text-danger text-sm">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || message.trim().length < 8}
          className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Sending…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

export default function ReportIssueModal({
  open,
  onClose,
  title = "Report an issue",
  initialCategory = "Bug",
  lockCategory = false,
  initialMessage = "",
  messageLabel = "What happened?",
  placeholder = "Describe what you expected and what happened instead.",
  submitLabel = "Send report",
  onSent,
  renderSuccess,
}: ReportIssueModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <IssueForm
        onClose={onClose}
        initialCategory={initialCategory}
        lockCategory={lockCategory}
        initialMessage={initialMessage}
        messageLabel={messageLabel}
        placeholder={placeholder}
        submitLabel={submitLabel}
        onSent={onSent}
        renderSuccess={renderSuccess}
      />
    </Modal>
  );
}
