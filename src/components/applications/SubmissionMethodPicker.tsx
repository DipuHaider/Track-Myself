"use client";

import { Check } from "lucide-react";
import { SUBMISSION_METHODS } from "@/constants/applicationStatus";

export default function SubmissionMethodPicker({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: string[];
  onToggle: (method: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-muted mb-1.5 text-xs font-medium">
        {label} <span className="font-normal">· pick all that apply</span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {SUBMISSION_METHODS.map((m) => {
          const on = value.includes(m);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(m)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                on ? "btn-primary" : "surface hover:bg-[var(--surface-2)]"
              }`}
            >
              {on && <Check size={11} aria-hidden="true" />}
              {m}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
