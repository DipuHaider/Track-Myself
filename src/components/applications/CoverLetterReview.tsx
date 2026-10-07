"use client";

import { Sparkles, Wand2 } from "lucide-react";
import type { CoverLetterText } from "@/lib/cv/coverLetter";

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

  return (
    <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
      <p className={`mb-3 flex items-start gap-1.5 text-xs ${upgrade ? "text-amber-600" : "text-muted"}`}>
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
          <textarea
            key={i}
            className={field}
            aria-label={`Paragraph ${i + 1}`}
            rows={Math.min(8, Math.max(3, Math.ceil(para.length / 90)))}
            value={para}
            onChange={(e) => setParagraph(i, e.target.value)}
          />
        ))}
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
