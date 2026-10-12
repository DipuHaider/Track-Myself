"use client";

import { useRef, type KeyboardEvent } from "react";

export type SettingsTabDef<K extends string> = {
  key: K;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export default function SettingsTabs<K extends string>({
  tabs, active, onChange, label = "Settings sections",
}: {
  tabs: SettingsTabDef<K>[];
  active: K;
  onChange: (key: K) => void;
  label?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusAndSelect = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    refs.current[next.key]?.focus();
    onChange(next.key);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusAndSelect(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusAndSelect(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        e.preventDefault();
        focusAndSelect(tabs.length - 1);
        break;
    }
  };

  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
      {tabs.map(({ key, label: text, icon: Icon }, index) => {
        const selected = key === active;
        return (
          <button
            key={key}
            ref={(el) => { refs.current[key] = el; }}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={selected}
            aria-controls={`panel-${key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKey(e, index)}
            className="-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition"
            style={selected
              ? { borderColor: "var(--primary)", color: "var(--primary)" }
              : { borderColor: "transparent", color: "var(--muted-foreground)" }}
          >
            <Icon size={14} aria-hidden="true" />
            {text}
          </button>
        );
      })}
    </div>
  );
}
