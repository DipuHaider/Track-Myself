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
};

export const BOLT_MAX_RADIUS = 25;

export const BOLT_PRESETS: BoltPreset[] = [
  { name: "hairline fork",   shape: "fork",     arms: 2, segments: 6,  jitter: 2.0, spread: 1.5, reach: 15, width: 0.9, glow: 4 },
  { name: "heavy fork",      shape: "fork",     arms: 3, segments: 8,  jitter: 3.6, spread: 2.1, reach: 23, width: 1.8, glow: 10 },
  { name: "quiet chain",     shape: "chain",    arms: 1, segments: 10, jitter: 1.6, spread: 0.9, reach: 18, width: 0.9, glow: 3 },
  { name: "storm chain",     shape: "chain",    arms: 2, segments: 13, jitter: 4.0, spread: 1.7, reach: 24, width: 1.6, glow: 9 },
  { name: "soft arc",        shape: "arc",      arms: 1, segments: 9,  jitter: 1.4, spread: 1.2, reach: 16, width: 1.1, glow: 6 },
  { name: "wide arc",        shape: "arc",      arms: 2, segments: 12, jitter: 3.0, spread: 2.4, reach: 23, width: 1.9, glow: 12 },
  { name: "close ring",      shape: "ring",     arms: 5, segments: 5,  jitter: 1.2, spread: 1.0, reach: 12, width: 1.0, glow: 5 },
  { name: "wide ring",       shape: "ring",     arms: 8, segments: 6,  jitter: 2.6, spread: 1.0, reach: 22, width: 1.4, glow: 11 },
  { name: "tight spiral",    shape: "spiral",   arms: 1, segments: 18, jitter: 0.9, spread: 1.0, reach: 14, width: 1.0, glow: 5 },
  { name: "loose spiral",    shape: "spiral",   arms: 2, segments: 24, jitter: 2.2, spread: 1.0, reach: 22, width: 1.3, glow: 8 },
  { name: "fine zigzag",     shape: "zigzag",   arms: 2, segments: 8,  jitter: 2.8, spread: 1.3, reach: 15, width: 0.9, glow: 4 },
  { name: "raw zigzag",      shape: "zigzag",   arms: 4, segments: 10, jitter: 5.0, spread: 2.2, reach: 24, width: 1.7, glow: 9 },
  { name: "filament",        shape: "filament", arms: 3, segments: 16, jitter: 1.1, spread: 2.6, reach: 19, width: 0.7, glow: 3 },
  { name: "bright filament", shape: "filament", arms: 5, segments: 20, jitter: 1.8, spread: 3.0, reach: 24, width: 1.1, glow: 8 },
  { name: "slim helix",      shape: "helix",    arms: 2, segments: 18, jitter: 0.9, spread: 1.0, reach: 17, width: 1.0, glow: 5 },
  { name: "twin helix",      shape: "helix",    arms: 4, segments: 22, jitter: 1.6, spread: 1.0, reach: 23, width: 1.4, glow: 10 },
  { name: "dry crackle",     shape: "crackle",  arms: 6, segments: 4,  jitter: 3.4, spread: 1.0, reach: 14, width: 0.8, glow: 3 },
  { name: "wet crackle",     shape: "crackle",  arms: 9, segments: 5,  jitter: 5.2, spread: 1.0, reach: 22, width: 1.2, glow: 9 },
  { name: "small star",      shape: "star",     arms: 4, segments: 3,  jitter: 1.3, spread: 1.0, reach: 13, width: 1.1, glow: 7 },
  { name: "burst star",      shape: "star",     arms: 7, segments: 4,  jitter: 3.0, spread: 1.0, reach: 24, width: 1.5, glow: 14 },
];

const RAMP: [number, number, number][] = [
  [255, 255, 255],
  [255, 228, 230],
  [252, 165, 165],
  [239,  68,  68],
  [153,  27,  27],
  [110,  15,  15],
];

export function boltColor(intensity: number, alpha = 1) {
  const t = Math.min(1, Math.max(0, intensity)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(t));
  const f = t - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

export const MITOSIS_TYPES = ["fission", "budding", "burst", "pinch", "bloom"] as const;
export type MitosisType = (typeof MITOSIS_TYPES)[number];

export const MITOSIS_SPEC: Record<MitosisType, {
  children: number;
  duration: number;
  separation: number;
  reach: number;
}> = {
  fission: { children: 2, duration: 96,  separation: 1.15, reach: 34 },
  budding: { children: 1, duration: 120, separation: 0.85, reach: 30 },
  burst:   { children: 3, duration: 78,  separation: 1.60, reach: 46 },
  pinch:   { children: 2, duration: 132, separation: 0.75, reach: 30 },
  bloom:   { children: 2, duration: 108, separation: 1.30, reach: 44 },
};

export const BIRTH_BOLT_FRAMES: [number, number] = [66, 120];
export const SPLIT_BOLT_FRAMES: [number, number] = [126, 180];
