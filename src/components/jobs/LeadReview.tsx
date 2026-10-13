"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Download, ExternalLink, FileText, Loader2, MapPin, Send, Sparkles, X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { refreshLeads, useLead, type LeadFile } from "@/hooks/useJobHunt";
import { DeadlineBadge, FitChip, LeadStatusBadge, postedLabel } from "@/components/jobs/LeadBadges";
import { SUBMISSION_METHODS } from "@/constants/applicationStatus";
import type { LeadView } from "@/lib/jobs/leads";
import Loading from "@/components/shared/Spinner";

type Letter = { greeting: string; paragraphs: string[]; closing: string };

function asLetter(raw: unknown): Letter | null {
  const l = raw as Partial<Letter> | null;
  if (!l || typeof l.greeting !== "string" || !Array.isArray(l.paragraphs) || typeof l.closing !== "string") return null;
  return { greeting: l.greeting, paragraphs: l.paragraphs.map(String), closing: l.closing };
}

const DEFAULT_METHOD: Record<string, string> = {
  LinkedIn: "LinkedIn Easy Apply",
  Xing: "XING Apply",
  Indeed: "Indeed Apply",
};

export default function LeadReview({ id }: { id: string }) {
  const { data, loading, error, mutate } = useLead(id);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <Loading padded={false} className="py-16" />;
  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        {error?.status === 404 ? "This job is no longer in your inbox." : "Could not load this job."}
      </div>
    );
  }

  const { lead, files } = data;

  const run = async (label: string, fn: () => Promise<unknown>, success?: string) => {
    setBusy(label);
    try {
      await fn();
      await Promise.all([mutate(), refreshLeads()]);
      if (success) toast.success(success);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  };

  const action = (a: string, extra: Record<string, unknown> = {}) =>
    apiFetch(`/api/user/leads/${id}`, { method: "PATCH", json: { action: a, ...extra } });

  const prepare = () => run(
    "prepare",
    () => apiFetch(`/api/user/leads/${id}/prepare`, { method: "POST", json: {} }),
    "Your CV and cover letter are ready to review.",
  );

  const applyWithExtension = () => run("apply", async () => {
    await action("applying");
    const target = `${lead.applyUrl || lead.url}#tm-lead=${encodeURIComponent(lead._id)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }, "Opened the application. The extension fills what it can and waits for you to submit.");

  const ready = lead.status === "ready" || lead.status === "applying";

  return (
    <div className="space-y-6">
      <Link href="/me/jobs" className="text-muted inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft size={14} aria-hidden="true" /> Job inbox
      </Link>

      <header className="surface rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{lead.title}</h1>
            <p className="text-muted mt-1 text-sm">
              {lead.company}
              {lead.location && <span className="ml-2 inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{lead.location}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FitChip score={lead.fitScore} mode={lead.fitMode} />
            <LeadStatusBadge status={lead.status} />
          </div>
        </div>
        <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>{postedLabel(lead.postedAt, lead.postedAgeText)}</span>
          <DeadlineBadge deadline={lead.deadline} />
          <span>Apply on {lead.platform}</span>
          {lead.salary && <span>{lead.salary}</span>}
        </div>
        {lead.error && <p className="alert alert-danger mt-3">{lead.error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {["new", "shortlisted", "failed"].includes(lead.status) && (
            <button type="button" onClick={prepare} disabled={busy !== null} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
              {busy === "prepare" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
              Prepare CV and cover letter
            </button>
          )}
          {ready && (
            <button type="button" onClick={applyWithExtension} disabled={busy !== null} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
              <Send size={14} aria-hidden="true" /> Approve and apply with the extension
            </button>
          )}
          <a href={lead.url} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
            <ExternalLink size={14} aria-hidden="true" /> Open posting
          </a>
          {lead.applicationId && (
            <Link href={`/me/applications?open=${lead.applicationId}`} className="btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
              Open in My Applications
            </Link>
          )}
          {!["submitted", "dismissed", "expired"].includes(lead.status) && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("dismiss", () => action("dismiss"), "Dismissed.").then(() => router.push("/me/jobs"))}
              className="btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
            >
              <X size={14} aria-hidden="true" /> Dismiss
            </button>
          )}
        </div>
      </header>

      {lead.prepared && (
        <section className="surface rounded-xl border p-5">
          <h2 className="mb-2 font-semibold">Your documents</h2>
          <p className="text-muted mb-3 text-sm">{lead.prepared.note}</p>
          {lead.prepared.changedFields.length > 0 && (
            <p className="mb-3 text-sm">Rewritten for this job: {lead.prepared.changedFields.join(", ")}. Roles and bullet points are never rewritten.</p>
          )}
          <FileList files={files} />
        </section>
      )}

      {lead.fitGaps.length > 0 && (
        <GapAnswers key={lead.fitGaps.map((g) => g.requirement).join("|")} lead={lead} busy={busy} onSave={(answers, retailor) => run(
          "answers",
          async () => {
            await action("answers", { answers });
            if (retailor) await apiFetch(`/api/user/leads/${id}/prepare`, { method: "POST", json: {} });
          },
          retailor ? "Re-tailored with your answers." : "Answers saved.",
        )} />
      )}

      {lead.prepared && asLetter(lead.prepared.letter) && (
        <LetterEditor
          key={JSON.stringify(lead.prepared.letter)}
          letter={asLetter(lead.prepared.letter)!}
          busy={busy === "letter"}
          onSave={(letter) => run("letter", () => action("letter", { letter }), "Cover letter updated.")}
        />
      )}

      {ready && (
        <MarkSubmitted
          platform={lead.platform}
          busy={busy === "submitted"}
          onSubmit={(method) => run("submitted", () => action("submitted", { submissionMethod: method }), "Marked as submitted. Good luck!")}
        />
      )}

      {lead.description && (
        <details className="surface rounded-xl border p-5">
          <summary className="cursor-pointer font-semibold">Job description</summary>
          <p className="mt-3 text-sm whitespace-pre-wrap">{lead.description}</p>
        </details>
      )}
    </div>
  );
}

function FileList({ files }: { files: LeadFile[] }) {
  if (!files.length) return <p className="text-muted text-sm">The documents were not saved. Prepare again to rebuild them.</p>;
  return (
    <ul className="space-y-2">
      {files.map((f) => (
        <li key={f._id} className="surface-muted flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2">
            <FileText size={14} aria-hidden="true" />
            <span className="truncate">{f.name}</span>
            <span className="text-muted shrink-0 text-xs">{f.docType === "cover-letter" ? "Cover letter" : "CV"}</span>
          </span>
          <a href={`/api/user/cv/files/${f._id}/raw`} className="btn-secondary inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs" download>
            <Download size={13} aria-hidden="true" /> Download
          </a>
        </li>
      ))}
    </ul>
  );
}

function GapAnswers({
  lead, busy, onSave,
}: {
  lead: LeadView;
  busy: string | null;
  onSave: (answers: { requirement: string; answer: string }[], retailor: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => Object.fromEntries(lead.fitGaps.map((g) => [g.requirement, g.answer])),
  );
  const baseId = useId();
  const list = lead.fitGaps.map((g) => ({ requirement: g.requirement, answer: answers[g.requirement] ?? "" }));
  const anyAnswered = list.some((a) => a.answer.trim());

  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 font-semibold">Gaps the posting mentions</h2>
      <p className="text-muted mb-4 text-sm">
        {lead.fitMode === "ai" ? "From the AI gap check." : "From word matching, so some may not be real gaps."} Answer the ones you
        have real experience with and the CV and letter can mention them. Leave the rest blank.
      </p>
      <ul className="space-y-3">
        {lead.fitGaps.map((g, i) => (
          <li key={g.requirement}>
            <label htmlFor={`${baseId}-${i}`} className="mb-1 block text-sm font-medium">{g.question || g.requirement}</label>
            <input
              id={`${baseId}-${i}`}
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={answers[g.requirement] ?? ""}
              maxLength={1000}
              placeholder="e.g. 2 years running services on Kubernetes at …"
              onChange={(e) => setAnswers((prev) => ({ ...prev, [g.requirement]: e.target.value }))}
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null} onClick={() => onSave(list, false)} className="btn-secondary rounded-md px-4 py-2 text-sm">
          Save answers
        </button>
        {lead.prepared && (
          <button type="button" disabled={busy !== null || !anyAnswered} onClick={() => onSave(list, true)} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
            {busy === "answers" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            Save and re-tailor
          </button>
        )}
      </div>
    </section>
  );
}

function LetterEditor({ letter, busy, onSave }: { letter: Letter; busy: boolean; onSave: (l: Letter) => void }) {
  const [greeting, setGreeting] = useState(letter.greeting);
  const [body, setBody] = useState(letter.paragraphs.join("\n\n"));
  const [closing, setClosing] = useState(letter.closing);
  const gid = useId();
  const bid = useId();
  const cid = useId();

  const dirty = greeting !== letter.greeting || body !== letter.paragraphs.join("\n\n") || closing !== letter.closing;

  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 font-semibold">Cover letter</h2>
      <p className="text-muted mb-4 text-sm">Edit freely. Saving rebuilds the letter document; your CV stays as it is.</p>
      <div className="space-y-3">
        <div>
          <label htmlFor={gid} className="mb-1 block text-sm font-medium">Greeting</label>
          <input id={gid} className="w-full rounded-md border px-3 py-2 text-sm" value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label htmlFor={bid} className="mb-1 block text-sm font-medium">Body</label>
          <textarea id={bid} rows={12} className="w-full rounded-md border px-3 py-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={`${bid}-hint`} />
          <p id={`${bid}-hint`} className="text-muted mt-1 text-xs">Separate paragraphs with a blank line.</p>
        </div>
        <div>
          <label htmlFor={cid} className="mb-1 block text-sm font-medium">Closing</label>
          <input id={cid} className="w-full rounded-md border px-3 py-2 text-sm" value={closing} onChange={(e) => setClosing(e.target.value)} maxLength={200} />
        </div>
      </div>
      <button
        type="button"
        disabled={!dirty || busy}
        onClick={() => onSave({ greeting, paragraphs: body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), closing })}
        className="btn-primary mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
      >
        {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        Save letter
      </button>
    </section>
  );
}

function MarkSubmitted({ platform, busy, onSubmit }: { platform: string; busy: boolean; onSubmit: (method: string) => void }) {
  const [method, setMethod] = useState(DEFAULT_METHOD[platform] ?? "Online / Job Portal");
  const id = useId();
  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 font-semibold">Already applied?</h2>
      <p className="text-muted mb-3 text-sm">
        The extension marks the application as submitted when it sees the site&apos;s confirmation. If you applied another
        way, record it here.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={id} className="mb-1 block text-sm font-medium">How you applied</label>
          <select id={id} value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
            {SUBMISSION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button type="button" disabled={busy} onClick={() => onSubmit(method)} className="btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
          <CheckCircle2 size={14} aria-hidden="true" /> Mark as submitted
        </button>
      </div>
    </section>
  );
}
