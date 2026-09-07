"use client";

import { useSyncExternalStore } from "react";

export type ChartTheme = {
  mode: "light" | "dark";
  series: string;
  ordinal: string[];
  grid: string;
  axis: string;
  ink: string;
  inkMuted: string;
  surface: string;
  border: string;
};

const LIGHT: ChartTheme = {
  mode: "light",
  series: "#2a78d6",
  ordinal: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"],
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  ink: "#111827",
  inkMuted: "#4b5563",
  surface: "#ffffff",
  border: "rgba(11,11,11,0.10)",
};

const DARK: ChartTheme = {
  mode: "dark",
  series: "#3987e5",
  ordinal: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5"],
  grid: "#2c2c2a",
  axis: "#383835",
  ink: "#f3f4f6",
  inkMuted: "#c3cad6",
  surface: "#1b1f2a",
  border: "rgba(255,255,255,0.10)",
};

function currentMode(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const stamped = document.documentElement.getAttribute("data-theme");
  if (stamped === "dark") return "dark";
  if (stamped === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

export function useChartTheme(): ChartTheme {
  const mode = useSyncExternalStore<"light" | "dark">(subscribe, currentMode, () => "light");
  return mode === "dark" ? DARK : LIGHT;
}
