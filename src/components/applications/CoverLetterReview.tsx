"use client";

import { Sparkles, Wand2 } from "lucide-react";
import { PROJECTS_HEADING, type CoverLetterText } from "@/lib/cv/letterLayout";

const field =
  "surface w-full rounded-md border px-2.5 py-1.5 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--primary)]";

export default function CoverLetterReview({
  letter,
  onChange,
  senderName,
  companyName,
  jobTitle,
  tailorMode,
  tailorNote,
  upgrade,
}: {
  letter: CoverLetterText;
  onChange: (letter: CoverLetterText) => void;
  senderName: string;
  companyName: string;
  jobTitle: string;
  tailorMode: "ai" | "heuristic" | "none";
  tailorNote: string;
  upgrade?: boolean;
}) {
  const setParagraph = (i: number, value: string) =>
    onChange({ ...letter, paragraphs: letter.paragraphs.map((p, j) => (j === i ? value : p)) });

  /* Mirrors letterBlocks(): the list prints before the closing paragraph. Lines are
     kept raw while typing; the server drops the blank ones when it renders. */
  const projectsAt = letter.paragraphs.length > 1 ? letter.paragraphs.length - 1 : letter.paragraphs.length;
  const projectsField = (
    <label className="block">
      <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">
        {PROJECTS_HEADING} · one per line, optional
      </span>
      <textarea
        className={field}
        rows={Math.min(6, Math.max(2, (letter.projects?.length ?? 0) + 1))}
        placeholder="e.g. Developers' Forum – profound-liger-f9751d.netlify.app (2024, MERN)"
        value={(letter.projects ?? []).join("\n")}
        onChange={(e) => onChange({ ...letter, projects: e.target.value.split("\n") })}
      />
    </label>
  );

  return (
    <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
      <p className={`mb-3 flex items-start gap-1.5 text-xs ${upgrade || tailorMode !== "ai" ? "text-warning" : "text-muted"}`}>
        {tailorMode === "ai"
          ? <Sparkles size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          : <Wand2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />}
        <span>{tailorNote}</span>
      </p>

      <div className="surface-muted space-y-2.5 rounded-lg border p-4">
        <p className="text-muted text-xs">
          {senderName || "You"} → {companyName} · Application for {jobTitle}
        </p>
        <input
          className={field}
          aria-label="Greeting"
          value={letter.greeting}
          onChange={(e) => onChange({ ...letter, greeting: e.target.value })}
        />
        {letter.paragraphs.map((para, i) => (
          <div key={i} className="space-y-2.5">
            {i === projectsAt && projectsField}
            <textarea
              className={field}
              aria-label={`Paragraph ${i + 1}`}
              rows={Math.min(8, Math.max(3, Math.ceil(para.length / 90)))}
              value={para}
              onChange={(e) => setParagraph(i, e.target.value)}
            />
          </div>
        ))}
        {projectsAt >= letter.paragraphs.length && projectsField}
        <input
          className={field}
          aria-label="Closing"
          value={letter.closing}
          onChange={(e) => onChange({ ...letter, closing: e.target.value })}
        />
        <p className="text-sm font-semibold">{senderName || "Your Name"}</p>
      </div>
    </div>
  );
}
