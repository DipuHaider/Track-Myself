export type BoltShape =
  | "fork" | "chain" | "arc" | "ring" | "spiral"
  | "zigzag" | "filament" | "helix" | "crackle" | "star";

export type BoltPreset = {
  name: string;
  shape: BoltShape;
  arms: number;
  segments: number;
  jitter: number;
  spread: number;
  reach: number;
  width: number;
  glow: number;
  life: number;
  color: string;
};

export const BOLT_PRESETS: BoltPreset[] = [
  { name: "hairline fork",   shape: "fork",     arms: 2, segments: 7,  jitter: 8,  spread: 1.5, reach: 46, width: 1.0, glow: 5,  life: 26, color: "#bfdbfe" },
  { name: "heavy fork",      shape: "fork",     arms: 3, segments: 9,  jitter: 15, spread: 2.1, reach: 74, width: 1.9, glow: 11, life: 34, color: "#93c5fd" },
  { name: "quiet chain",     shape: "chain",    arms: 1, segments: 12, jitter: 6,  spread: 0.9, reach: 58, width: 0.9, glow: 4,  life: 30, color: "#a5f3fc" },
  { name: "storm chain",     shape: "chain",    arms: 2, segments: 16, jitter: 17, spread: 1.7, reach: 96, width: 1.7, glow: 10, life: 38, color: "#67e8f9" },
  { name: "soft arc",        shape: "arc",      arms: 1, segments: 10, jitter: 5,  spread: 1.2, reach: 52, width: 1.2, glow: 7,  life: 28, color: "#c4b5fd" },
  { name: "wide arc",        shape: "arc",      arms: 2, segments: 14, jitter: 12, spread: 2.4, reach: 88, width: 2.0, glow: 13, life: 36, color: "#a78bfa" },
  { name: "close ring",      shape: "ring",     arms: 5, segments: 6,  jitter: 4,  spread: 1.0, reach: 30, width: 1.0, glow: 6,  life: 24, color: "#e0e7ff" },
  { name: "wide ring",       shape: "ring",     arms: 8, segments: 8,  jitter: 10, spread: 1.0, reach: 62, width: 1.5, glow: 12, life: 34, color: "#818cf8" },
  { name: "tight spiral",    shape: "spiral",   arms: 1, segments: 22, jitter: 3,  spread: 1.0, reach: 40, width: 1.0, glow: 6,  life: 32, color: "#5eead4" },
  { name: "loose spiral",    shape: "spiral",   arms: 2, segments: 30, jitter: 8,  spread: 1.0, reach: 78, width: 1.4, glow: 9,  life: 42, color: "#2dd4bf" },
  { name: "fine zigzag",     shape: "zigzag",   arms: 2, segments: 9,  jitter: 11, spread: 1.3, reach: 44, width: 0.9, glow: 4,  life: 22, color: "#fde68a" },
  { name: "raw zigzag",      shape: "zigzag",   arms: 4, segments: 11, jitter: 21, spread: 2.2, reach: 82, width: 1.8, glow: 10, life: 32, color: "#fbbf24" },
  { name: "filament",        shape: "filament", arms: 3, segments: 18, jitter: 4,  spread: 2.6, reach: 66, width: 0.7, glow: 3,  life: 44, color: "#f5d0fe" },
  { name: "bright filament", shape: "filament", arms: 5, segments: 22, jitter: 7,  spread: 3.0, reach: 92, width: 1.1, glow: 8,  life: 52, color: "#f0abfc" },
  { name: "slim helix",      shape: "helix",    arms: 2, segments: 20, jitter: 3,  spread: 1.0, reach: 56, width: 1.0, glow: 6,  life: 36, color: "#7dd3fc" },
  { name: "twin helix",      shape: "helix",    arms: 4, segments: 26, jitter: 6,  spread: 1.0, reach: 84, width: 1.5, glow: 11, life: 46, color: "#38bdf8" },
  { name: "dry crackle",     shape: "crackle",  arms: 6, segments: 5,  jitter: 14, spread: 1.0, reach: 38, width: 0.8, glow: 3,  life: 18, color: "#fecaca" },
  { name: "wet crackle",     shape: "crackle",  arms: 9, segments: 6,  jitter: 22, spread: 1.0, reach: 70, width: 1.3, glow: 9,  life: 28, color: "#fca5a5" },
  { name: "small star",      shape: "star",     arms: 4, segments: 4,  jitter: 5,  spread: 1.0, reach: 34, width: 1.1, glow: 8,  life: 20, color: "#ffffff" },
  { name: "burst star",      shape: "star",     arms: 7, segments: 5,  jitter: 13, spread: 1.0, reach: 76, width: 1.6, glow: 15, life: 30, color: "#e2e8f0" },
];

export const MITOSIS_TYPES = ["fission", "budding", "burst", "pinch", "bloom"] as const;
export type MitosisType = (typeof MITOSIS_TYPES)[number];

export const MITOSIS_SPEC: Record<MitosisType, {
  children: number;
  duration: number;
  separation: number;
  bolts: number;
}> = {
  fission: { children: 2, duration: 46, separation: 1.35, bolts: 1 },
  budding: { children: 1, duration: 58, separation: 1.10, bolts: 1 },
  burst:   { children: 3, duration: 34, separation: 2.00, bolts: 2 },
  pinch:   { children: 2, duration: 72, separation: 0.95, bolts: 1 },
  bloom:   { children: 2, duration: 54, separation: 1.60, bolts: 3 },
};
