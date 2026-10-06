"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { Toaster } from "sonner";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

const THEMED = {
  "--normal-bg": "var(--surface)",
  "--normal-text": "var(--foreground)",
  "--normal-border": "var(--border)",
} as CSSProperties;

export default function AppToaster() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as const);

  return (
    <Toaster
      theme={theme}
      position="bottom-center"
      closeButton
      richColors
      duration={5000}
      style={THEMED}
    />
  );
}
