"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

export const inputCls =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";

export const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

export function Field({
  label, value, onChange, placeholder, hint, type = "input", rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: "input" | "textarea";
  rows?: number;
}) {
  return (
    <div>
      <label className="text-muted mb-1 block text-xs font-medium">{label}</label>
      {type === "textarea" ? (
        <textarea
          className={`${inputCls} resize-y leading-relaxed`}
          style={inputStyle}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={inputCls}
          style={inputStyle}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="text-muted mt-1 text-[11px] leading-relaxed">{hint}</p>}
    </div>
  );
}

export function Section({
  title, hint, action, children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-wider">{title}</p>
          {hint && <p className="text-muted mt-0.5 text-[11px] leading-relaxed">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
    >
      <Plus size={13} aria-hidden="true" /> {label}
    </button>
  );
}

export function RepeatCard({
  index, total, title, onMove, onRemove, children,
}: {
  index: number;
  total: number;
  title: string;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{title}</p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            title="Move up"
            className="text-muted rounded p-1 transition hover:bg-[var(--surface-2)] disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
            title="Move down"
            className="text-muted rounded p-1 transition hover:bg-[var(--surface-2)] disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            title="Remove"
            className="text-muted rounded p-1 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function StringListEditor({
  items, onChange, placeholder, addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            className={`${inputCls} resize-y leading-relaxed`}
            style={inputStyle}
            rows={2}
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            title="Remove"
            className="text-muted mt-1 rounded p-1.5 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <AddButton label={addLabel} onClick={() => onChange([...items, ""])} />
    </div>
  );
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
