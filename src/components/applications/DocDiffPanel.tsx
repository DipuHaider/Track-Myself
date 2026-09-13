"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, FileText, Sparkles } from "lucide-react";
import type { DiffOp } from "@/lib/cv/diff/wordDiff";

export type SectionDiff = {
  key: string;
  label: string;
  left: string;
  right: string;
  ops: DiffOp[];
  changed: boolean;
  onlyIn: "left" | "right" | null;
  degraded: boolean;
};

export type DocDiff = {
  sections: SectionDiff[];
  stats: { added: number; removed: number; changedSections: number };
  degraded: boolean;
  empty: boolean;
};

export type LeftSource = { kind: "main-cv-file" | "builder"; name: string; note: string };

function Side({ ops, side }: { ops: DiffOp[]; side: "left" | "right" }) {
  const keep = side === "left" ? "delete" : "insert";
  const cls = side === "left" ? "diff-del" : "diff-ins";

  return (
    <div className="diff-pane text-[12px]">
      {ops.map((op, i) => {
        if (op.type === "equal") return <span key={i}>{op.text}</span>;
        if (op.type !== keep) return null;
        return <span key={i} className={cls}>{op.text}</span>;
      })}
    </div>
  );
}

export default function DocDiffPanel({
  diff,
  leftSource,
  tailorMode,
  tailorNote,
  providerLabel,
  upgrade,
}: {
  diff: DocDiff;
  leftSource: LeftSource;
  tailorMode: "ai" | "heuristic" | "none";
  tailorNote: string;
  providerLabel?: string;
  upgrade?: boolean;
}) {
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const shown = useMemo(
    () => (onlyChanged ? diff.sections.filter((s) => s.changed) : diff.sections),
    [diff.sections, onlyChanged],
  );

  const leftLabel = leftSource.kind === "main-cv-file" ? leftSource.name : "Your CV Builder content";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={
              tailorMode === "ai"
                ? { background: "var(--primary)", color: "#fff" }
                : { background: "var(--surface-2)", color: "var(--muted-foreground)" }
            }
          >
            {tailorMode === "ai" ? <Sparkles size={10} aria-hidden="true" /> : <AlertCircle size={10} aria-hidden="true" />}
            {tailorMode === "ai"
              ? providerLabel ? `Tailored by ${providerLabel}` : "AI tailored"
              : tailorMode === "heuristic" ? "Reordered only" : "Untailored"}
          </span>
          <p className="text-muted min-w-0 flex-1 text-[11px] leading-snug">{tailorNote}</p>
          {upgrade && (
            <a href="/me" className="text-[11px] font-semibold underline" style={{ color: "var(--primary)" }}>
              Upgrade
            </a>
          )}
        </div>

        {leftSource.note && (
          <p className="text-muted flex items-start gap-1.5 text-[11px] leading-snug">
            <AlertCircle size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
            {leftSource.note}
          </p>
        )}

        {!diff.empty && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-muted text-[11px]">
              <strong style={{ color: "#047857" }}>+{diff.stats.added}</strong>{" "}
              <strong style={{ color: "#b91c1c" }}>−{diff.stats.removed}</strong> words across{" "}
              {diff.stats.changedSections} section{diff.stats.changedSections === 1 ? "" : "s"}
            </p>
            <label className="text-muted flex cursor-pointer items-center gap-1.5 text-[11px]">
              <input
                type="checkbox"
                checked={onlyChanged}
                onChange={(e) => setOnlyChanged(e.target.checked)}
              />
              Only changed sections
            </label>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {diff.empty ? (
          <div className="flex flex-col items-center gap-2 px-8 py-10 text-center">
            <Check size={22} style={{ color: "var(--primary)" }} aria-hidden="true" />
            <p className="text-sm font-semibold">No text changes</p>
            <p className="text-muted max-w-md text-xs leading-relaxed">
              {tailorMode === "ai"
                ? "The model did not change any wording for this role. The document is your CV as it stands."
                : "Free tailoring only reorders sections, and a compact layout uses your short summary — so the wording is identical to your Main CV. Premium AI tailoring rewrites the summary and positioning for this role."}
            </p>
          </div>
        ) : (
          <>
            <div className="surface-muted text-muted sticky top-0 z-10 grid grid-cols-2 gap-4 border-b px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wide">
              <span className="truncate">{leftLabel}</span>
              <span className="truncate">Generated for this job</span>
            </div>

            {shown.map((s) => {
              const expanded = open[s.key] ?? s.changed;
              return (
                <div key={s.key} className={`border-b last:border-b-0 ${s.changed ? "diff-section-changed" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setOpen((p) => ({ ...p, [s.key]: !expanded }))}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-2 px-5 py-2 text-left transition hover:bg-[var(--surface-2)]"
                  >
                    <FileText size={12} className="text-muted shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-xs font-semibold">{s.label}</span>
                    {s.onlyIn === "right" && (
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "#dcfce7", color: "#14532d" }}>
                        NEW
                      </span>
                    )}
                    {s.onlyIn === "left" && (
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "#fee2e2", color: "#7f1d1d" }}>
                        DROPPED
                      </span>
                    )}
                    {s.degraded && <span className="text-muted text-[9px]">rewritten wholesale</span>}
                    <ChevronDown
                      size={12}
                      aria-hidden="true"
                      className="rotates text-muted shrink-0"
                      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>

                  <div className="disclosure" data-open={expanded}>
                    <div inert={!expanded}>
                      <div className="grid grid-cols-1 gap-4 px-5 pb-4 sm:grid-cols-2">
                        <Side ops={s.ops} side="left" />
                        <Side ops={s.ops} side="right" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
