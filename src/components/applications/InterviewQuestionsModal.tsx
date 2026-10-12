"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import Modal from "@/components/shared/Modal";

export type QuestionPreview = {
  total: number;
  family: string;
  aiCount: number;
  exhausted: boolean;
  seenBefore: number;
  sections: { label: string; questions: { text: string; prompt: string; answer: string }[] }[];
};

export default function InterviewQuestionsModal({
  data, title, onClose,
}: {
  data: QuestionPreview;
  title: string;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);

  /* Numbering derived up front — a counter mutated during render is rejected by
     the compiler and breaks if a subtree re-renders on its own. */
  const startAt = data.sections.map((_, i) =>
    data.sections.slice(0, i).reduce((acc, s) => acc + s.questions.length, 0),
  );

  return (
    <Modal open onClose={onClose} title="Interview questions" size="xl">
      <div className="border-b px-5 py-2.5">
        <p className="text-muted text-xs">
          {title} · {data.total} questions
          {data.aiCount > 0 && ` · ${data.aiCount} tailored to this posting`}
          {data.seenBefore > 0 && ` · ${data.seenBefore} already issued before`}
        </p>
      </div>

      {data.exhausted && (
        <div className="px-5 pt-3">
          <p className="alert alert-warning text-xs">
            The bank ran out of unseen questions for this role, so some you have already had are
            included again.
          </p>
        </div>
      )}

      <div className="px-5 py-4">
        {data.sections.map((section, si) => (
          <section key={section.label} className="mb-5 last:mb-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              {section.label}
            </h3>

            <ul className="space-y-1.5">
              {section.questions.map((q, qi) => {
                const n = startAt[si] + qi + 1;
                const key = `${section.label}-${n}`;
                const expanded = open === key;

                return (
                  <li key={key} className="surface-muted rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : key)}
                      aria-expanded={expanded}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                    >
                      <span className="text-muted mt-0.5 shrink-0 font-mono text-[11px]">{n}</span>
                      <span className="min-w-0 flex-1 text-sm">{q.text}</span>
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className="rotates text-muted mt-0.5 shrink-0"
                        style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>

                    <div className="disclosure" data-open={expanded}>
                      <div inert={!expanded}>
                        <div className="border-t px-3 py-2.5 pl-9">
                          {q.answer ? (
                            <p className="flex items-start gap-2 text-sm">
                              <Lightbulb size={13} className="text-warning mt-0.5 shrink-0" aria-hidden="true" />
                              <span className="text-muted">{q.answer}</span>
                            </p>
                          ) : (
                            <p className="text-muted text-sm">
                              No stock guidance for this one — it was tailored to your posting, so
                              answer it from your own experience.
                            </p>
                          )}
                          {q.prompt && (
                            <p className="text-muted mt-1.5 pl-5 text-xs italic">{q.prompt}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="surface sticky bottom-0 border-t px-5 py-2.5">
        <p className="text-muted text-[11px]">
          Tap a question to see what the interviewer is testing for.
        </p>
      </div>
    </Modal>
  );
}
