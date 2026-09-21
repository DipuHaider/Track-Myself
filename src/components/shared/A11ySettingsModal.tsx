"use client";

import { Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { useA11y } from "@/hooks/useA11y";
import {
  COLOR_SCHEMES, COLOR_SCHEME_LABELS, TEXT_SCALES, TEXT_SCALE_LABELS,
  type A11yPrefs, type ColorScheme,
} from "@/lib/a11y";

const SCHEME_ICONS: Record<ColorScheme, React.ReactNode> = {
  light: <Sun size={14} aria-hidden="true" />,
  dark: <Moon size={14} aria-hidden="true" />,
  system: <Monitor size={14} aria-hidden="true" />,
};

const TOGGLES: { key: keyof A11yPrefs; label: string; hint: string }[] = [
  { key: "contrast", label: "High contrast", hint: "Stronger borders, darker body text and a thicker focus ring." },
  { key: "reduceMotion", label: "Reduce motion", hint: "Stops animations and the animated hero background." },
  { key: "dyslexiaFont", label: "Dyslexia-friendly font", hint: "Switches body text to a more legible typeface." },
  { key: "readingSpacing", label: "Extra reading space", hint: "Looser line height, letter and word spacing." },
  { key: "underlineLinks", label: "Underline links", hint: "Underlines every link so they don't rely on colour alone." },
];

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full border transition"
      style={{
        background: on ? "var(--primary)" : "var(--surface-2)",
        borderColor: on ? "var(--primary)" : "var(--border)",
      }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "1.5rem" : "0.2rem" }}
      />
    </button>
  );
}

export default function A11ySettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, update, reset } = useA11y();

  return (
    <Modal open={open} onClose={onClose} title="Accessibility & display">
      <div className="space-y-6 p-5">
        <section>
          <p className="mb-2 text-sm font-medium">Text size</p>
          <div className="grid grid-cols-4 gap-2">
            {TEXT_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => update({ textScale: scale })}
                aria-pressed={prefs.textScale === scale}
                className={`rounded-lg border px-2 py-2 text-sm transition ${
                  prefs.textScale === scale ? "border-[var(--primary)] text-[var(--primary)]" : "surface-muted"
                }`}
              >
                <span style={{ fontSize: scale === "sm" ? 12 : scale === "md" ? 14 : scale === "lg" ? 16 : 18 }}>
                  Aa
                </span>
                <span className="text-muted mt-0.5 block text-[11px]">{TEXT_SCALE_LABELS[scale]}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-medium">Colour scheme</p>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_SCHEMES.map((scheme) => (
              <button
                key={scheme}
                type="button"
                onClick={() => update({ scheme })}
                aria-pressed={prefs.scheme === scheme}
                className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm transition ${
                  prefs.scheme === scheme ? "border-[var(--primary)] text-[var(--primary)]" : "surface-muted"
                }`}
              >
                {SCHEME_ICONS[scheme]}
                {COLOR_SCHEME_LABELS[scheme]}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {TOGGLES.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-muted text-xs">{row.hint}</p>
              </div>
              <Switch
                label={row.label}
                on={prefs[row.key] === true}
                onChange={() => update({ [row.key]: !prefs[row.key] } as Partial<A11yPrefs>)}
              />
            </div>
          ))}
        </section>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted text-xs">Saved to your account and applied on every device.</p>
          <button
            type="button"
            onClick={reset}
            className="text-muted flex items-center gap-1.5 text-sm hover:text-[var(--primary)]"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
    </Modal>
  );
}
