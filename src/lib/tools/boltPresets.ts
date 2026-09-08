export type BoltPreset = {
  name: string;
  arms: number;
  generations: number;
  displace: number;
  roughness: number;
  branchChance: number;
  branchAngle: number;
  branchDecay: number;
  maxDepth: number;
  reach: number;
  width: number;
  glow: number;
  flicker: number;
};

export const BOLT_MAX_RADIUS = 25;

export const BOLT_PRESETS: BoltPreset[] = [
  { name: "capacitor snap",  arms: 1, generations: 5, displace: 3.4, roughness: 0.52, branchChance: 0.10, branchAngle: 0.42, branchDecay: 0.58, maxDepth: 1, reach: 17, width: 1.0, glow: 5,  flicker: 0.35 },
  { name: "brush arc",       arms: 1, generations: 6, displace: 2.2, roughness: 0.48, branchChance: 0.05, branchAngle: 0.30, branchDecay: 0.52, maxDepth: 1, reach: 21, width: 0.8, glow: 4,  flicker: 0.55 },
  { name: "jacob's ladder",  arms: 1, generations: 6, displace: 4.6, roughness: 0.55, branchChance: 0.14, branchAngle: 0.50, branchDecay: 0.62, maxDepth: 2, reach: 24, width: 1.5, glow: 10, flicker: 0.28 },
  { name: "root strike",     arms: 1, generations: 6, displace: 3.0, roughness: 0.58, branchChance: 0.34, branchAngle: 0.55, branchDecay: 0.66, maxDepth: 3, reach: 24, width: 1.2, glow: 7,  flicker: 0.22 },
  { name: "taproot",         arms: 1, generations: 5, displace: 2.4, roughness: 0.50, branchChance: 0.42, branchAngle: 0.68, branchDecay: 0.60, maxDepth: 3, reach: 22, width: 1.0, glow: 6,  flicker: 0.20 },
  { name: "hair filament",   arms: 1, generations: 7, displace: 1.4, roughness: 0.46, branchChance: 0.03, branchAngle: 0.22, branchDecay: 0.45, maxDepth: 1, reach: 19, width: 0.6, glow: 3,  flicker: 0.62 },
  { name: "twin leader",     arms: 2, generations: 5, displace: 3.2, roughness: 0.53, branchChance: 0.12, branchAngle: 0.40, branchDecay: 0.55, maxDepth: 1, reach: 20, width: 1.1, glow: 7,  flicker: 0.30 },
  { name: "fork discharge",  arms: 2, generations: 6, displace: 4.0, roughness: 0.56, branchChance: 0.26, branchAngle: 0.58, branchDecay: 0.64, maxDepth: 2, reach: 23, width: 1.4, glow: 9,  flicker: 0.26 },
  { name: "creeping corona", arms: 3, generations: 5, displace: 1.8, roughness: 0.44, branchChance: 0.18, branchAngle: 0.34, branchDecay: 0.50, maxDepth: 2, reach: 14, width: 0.7, glow: 5,  flicker: 0.58 },
  { name: "commutator spit", arms: 3, generations: 4, displace: 5.0, roughness: 0.60, branchChance: 0.08, branchAngle: 0.46, branchDecay: 0.55, maxDepth: 1, reach: 16, width: 1.3, glow: 8,  flicker: 0.50 },
  { name: "long leader",     arms: 1, generations: 7, displace: 3.6, roughness: 0.54, branchChance: 0.16, branchAngle: 0.44, branchDecay: 0.62, maxDepth: 2, reach: 25, width: 1.2, glow: 8,  flicker: 0.24 },
  { name: "return stroke",   arms: 1, generations: 5, displace: 5.4, roughness: 0.58, branchChance: 0.20, branchAngle: 0.52, branchDecay: 0.68, maxDepth: 2, reach: 25, width: 2.0, glow: 14, flicker: 0.18 },
  { name: "dry spark",       arms: 2, generations: 4, displace: 2.6, roughness: 0.48, branchChance: 0.06, branchAngle: 0.36, branchDecay: 0.48, maxDepth: 1, reach: 12, width: 0.9, glow: 3,  flicker: 0.66 },
  { name: "arc weld",        arms: 2, generations: 5, displace: 4.4, roughness: 0.57, branchChance: 0.10, branchAngle: 0.48, branchDecay: 0.58, maxDepth: 1, reach: 19, width: 1.7, glow: 12, flicker: 0.40 },
  { name: "creeper root",    arms: 1, generations: 6, displace: 2.0, roughness: 0.50, branchChance: 0.46, branchAngle: 0.72, branchDecay: 0.58, maxDepth: 3, reach: 20, width: 0.9, glow: 5,  flicker: 0.18 },
  { name: "storm branch",    arms: 1, generations: 7, displace: 4.2, roughness: 0.59, branchChance: 0.30, branchAngle: 0.60, branchDecay: 0.70, maxDepth: 3, reach: 25, width: 1.3, glow: 10, flicker: 0.22 },
  { name: "static crawl",    arms: 4, generations: 4, displace: 1.6, roughness: 0.42, branchChance: 0.12, branchAngle: 0.30, branchDecay: 0.45, maxDepth: 1, reach: 11, width: 0.7, glow: 4,  flicker: 0.70 },
  { name: "brush corona",    arms: 4, generations: 5, displace: 2.8, roughness: 0.50, branchChance: 0.22, branchAngle: 0.42, branchDecay: 0.54, maxDepth: 2, reach: 18, width: 1.0, glow: 7,  flicker: 0.46 },
  { name: "flashover",       arms: 3, generations: 6, displace: 3.8, roughness: 0.55, branchChance: 0.24, branchAngle: 0.50, branchDecay: 0.62, maxDepth: 2, reach: 23, width: 1.5, glow: 11, flicker: 0.32 },
  { name: "dead short",      arms: 1, generations: 4, displace: 1.2, roughness: 0.40, branchChance: 0.02, branchAngle: 0.20, branchDecay: 0.40, maxDepth: 1, reach: 25, width: 1.8, glow: 13, flicker: 0.14 },
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
  return `rgba(${Math.round(a[0] + (b[0] - a[0]) * f)}, ${Math.round(a[1] + (b[1] - a[1]) * f)}, ${Math.round(a[2] + (b[2] - a[2]) * f)}, ${alpha})`;
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
