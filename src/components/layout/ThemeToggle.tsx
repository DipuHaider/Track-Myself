"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useA11y } from "@/hooks/useA11y";

type Theme = "light" | "dark";

/* Routes through the accessibility preferences so the choice lands in the
   same storage the boot script reads. Writing only the legacy "theme" key
   meant the toggle silently reverted on reload once tm-a11y existed. */
export default function ThemeToggle({
  variant = "button",
  onToggled,
}: {
  variant?: "button" | "menu";
  onToggled?: () => void;
}) {
  const theme = useTheme();
  const { update } = useA11y();
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    update({ scheme: next });
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
