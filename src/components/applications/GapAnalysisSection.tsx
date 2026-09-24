"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Target } from "lucide-react";

type Verdict = "match" | "partial" | "not-evidenced" | "unclear";

type GapItem = {
  requirement: string;
  excerpt: string;
  level: "required" | "preferred" | "unclear";
  verdict: Verdict;
  evidence: string[];
  suggestion: string;
  question: string;
};

type Analysis = { mode: "ai" | "keyword"; items: GapItem[]; note: string; error?: string };

const VERDICT_LABEL: Record<Verdict, string> = {
  match: "In your CV",
  partial: "Partly",
  "not-evidenced": "Not in your CV",
  unclear: "Unclear",
};

const VERDICT_CLASS: Record<Verdict, string> = {
  match: "status-offer",
  partial: "status-active",
  "not-evidenced": "status-no-resp",
  unclear: "status-submitted",
};

export default function GapAnalysisSection({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<Analysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const loadFree = useCallback(() => {
    fetch(`/api/user/applications/${applicationId}/gap-analysis`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, [applicationId]);

  useEffect(loadFree, [loadFree]);

  const runAi = async () => {
    if (running) return;
    setRunning(true);
    setError("");

    const res = await fetch(`/api/user/applications/${applicationId}/gap-analysis`, {
      method: "POST",
    }).catch(() => null);

    setRunning(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Could not analyse this job.");
      return;
    }
    setData(await res.json());
  };

  if (!data) return null;

  const items = data.items ?? [];

  return (
    <div className="mt-4 border-t pt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <Target size={13} aria-hidden="true" />
          How your CV matches this job
        </p>

        <button
          type="button"
          onClick={runAi}
          disabled={running}
          className="btn-primary flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs disabled:opacity-60"
        >
          {running
            ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Analysing…</>
            : <><Sparkles size={12} aria-hidden="true" /> {data.mode === "ai" ? "Run again" : "Analyse with AI"}</>}
        </button>
      </div>

      {data.note && <p className="text-muted mb-3 text-[11px] leading-snug">{data.note}</p>}
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {!items.length && (
        <p className="text-muted text-xs">
          Nothing to compare yet — save the job description for this application first.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={`${item.requirement}-${i}`} className="surface-muted rounded-lg border p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`role-badge ${VERDICT_CLASS[item.verdict]}`}>
                {VERDICT_LABEL[item.verdict]}
              </span>
              {item.level === "required" && (
                <span className="role-badge priority-high">Required</span>
              )}
              <span className="text-xs font-medium">{item.requirement}</span>
            </div>

            {item.excerpt && (
              <p className="text-muted mt-1.5 border-l-2 pl-2 text-[11px] italic leading-snug">
                {item.excerpt}
              </p>
            )}

            {item.evidence.length > 0 && (
              <p className="text-muted mt-1.5 text-[11px]">
                Found in: {item.evidence.join(", ")}
              </p>
            )}

            {item.suggestion && (
              <p className="mt-1.5 text-[11px] leading-snug">
                <span className="font-medium">Could say:</span> {item.suggestion}
              </p>
            )}

            {item.question && (
              <p className="text-muted mt-1.5 text-[11px] leading-snug">{item.question}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
