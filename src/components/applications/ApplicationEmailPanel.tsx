"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, Mail, RefreshCw, Send, Sparkles, Wand2 } from "lucide-react";
import type { AppInfo } from "@/components/applications/AppDocModal";

type EmailResponse = {
  subject: string;
  body: string;
  mode: "ai" | "heuristic";
  note: string;
  upgrade?: boolean;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Your browser blocked the clipboard. Select the text and copy it instead.");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      className="flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
    >
      {copied ? <Check size={11} className="text-success" aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function ApplicationEmailPanel({ info, disabled }: { info: AppInfo; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EmailResponse | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [correction, setCorrection] = useState("");

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/user/cv/generate/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appInfo: info, correction }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Could not write the email.");
      setResult(data as EmailResponse);
      setSubject(data.subject);
      setBody(data.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the email.");
    } finally {
      setBusy(false);
    }
  };

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="border-t px-5 py-4">
      <div className="flex items-start gap-3">
        <Mail size={14} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Application Email</p>
          <p className="text-muted text-[11px] leading-snug">
            A subject line and a short covering email to paste into a new mail, with your CV and letter attached.
          </p>

          {error && <p className="text-danger mt-2 text-xs" role="alert">{error}</p>}

          {result && (
            <div className="mt-3 space-y-2.5">
              <p className={`flex items-start gap-1.5 text-[11px] ${result.mode === "ai" ? "text-muted" : "text-warning"}`}>
                {result.mode === "ai"
                  ? <Sparkles size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                  : <Wand2 size={12} className="mt-0.5 shrink-0" aria-hidden="true" />}
                <span>{result.note}</span>
              </p>

              <label className="block">
                <span className="mb-1 flex items-center justify-between">
                  <span className="text-muted text-[10px] font-semibold uppercase tracking-wide">Subject</span>
                  <CopyButton text={subject} label="Copy subject" />
                </span>
                <input
                  className="surface w-full rounded-md border px-2.5 py-1.5 text-xs"
                  value={subject}
                  maxLength={200}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between">
                  <span className="text-muted text-[10px] font-semibold uppercase tracking-wide">Body</span>
                  <CopyButton text={body} label="Copy body" />
                </span>
                <textarea
                  className="surface w-full rounded-md border px-2.5 py-1.5 text-xs leading-relaxed"
                  rows={12}
                  maxLength={4000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <CopyButton text={`Subject: ${subject}\n\n${body}`} label="Copy both" />
                <a
                  href={mailto}
                  className="flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition hover:bg-[var(--surface-2)]"
                >
                  <Send size={11} aria-hidden="true" /> Open in mail app
                </a>
              </div>

              <label className="block">
                <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">
                  Corrections (optional)
                </span>
                <textarea
                  className="surface w-full rounded-md border px-2.5 py-1.5 text-xs"
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. write it in German, mention the reference number, shorter."
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                />
              </label>
            </div>
          )}

          <button
            type="button"
            disabled={busy || disabled}
            onClick={generate}
            className="btn-primary mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {busy
              ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Writing…</>
              : result
                ? <><RefreshCw size={12} aria-hidden="true" /> Regenerate</>
                : <><Mail size={12} aria-hidden="true" /> Generate email</>}
          </button>
        </div>
      </div>
    </div>
  );
}
