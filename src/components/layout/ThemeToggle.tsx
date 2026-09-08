"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_EVENT = "theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("theme", theme); } catch {}
  window.dispatchEvent(new Event(THEME_EVENT));
}

export default function ThemeToggle({
  variant = "button",
  onToggled,
}: {
  variant?: "button" | "menu";
  onToggled?: () => void;
}) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    applyTheme(next);
    onToggled?.();
  };

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={toggle}
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
      >
        {theme === "dark"
          ? <Sun size={15} aria-hidden="true" />
          : <Moon size={15} aria-hidden="true" />}
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-md border transition hover:bg-[var(--surface-2)]"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === "dark"
        ? <Sun size={15} aria-hidden="true" />
        : <Moon size={15} aria-hidden="true" />}
    </button>
  );
}
