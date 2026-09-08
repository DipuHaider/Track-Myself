export type SafeZone = {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "avoid" | "keep-inside";
};

export type BannerPreset = {
  key: string;
  platform: string;
  label: string;
  width: number;
  height: number;
  note: string;
  maxBytes?: number;
  safeZones: SafeZone[];
};

export const BANNER_PRESETS: BannerPreset[] = [
  {
    key: "linkedin-profile",
    platform: "LinkedIn",
    label: "Profile cover",
    width: 1584,
    height: 396,
    note: "4:1 · PNG or JPG up to 8 MB. Your profile photo sits over the bottom-left.",
    maxBytes: 8 * 1024 * 1024,
    safeZones: [
      { label: "Profile photo overlaps here", x: 0, y: 132, width: 568, height: 264, kind: "avoid" },
    ],
  },
  {
    key: "linkedin-company",
    platform: "LinkedIn",
    label: "Company page cover",
    width: 1128,
    height: 191,
    note: "Company pages use a shorter, wider cover than personal profiles.",
    safeZones: [],
  },
  {
    key: "github-readme",
    platform: "GitHub",
    label: "Profile README banner",
    width: 1776,
    height: 592,
    note: "3:1 at 2× — READMEs render at 888 px wide, so this stays crisp on retina.",
    safeZones: [],
  },
  {
    key: "github-social",
    platform: "GitHub",
    label: "Repo social preview",
    width: 1280,
    height: 640,
    note: "2:1 · under 1 MB. Shown when a repo link is shared.",
    maxBytes: 1024 * 1024,
    safeZones: [],
  },
  {
    key: "x-header",
    platform: "X",
    label: "Profile header",
    width: 1500,
    height: 500,
    note: "3:1 · under 5 MB. Phones centre-crop to roughly 600 × 200.",
    maxBytes: 5 * 1024 * 1024,
    safeZones: [
      { label: "Mobile crop — keep text inside", x: 450, y: 150, width: 600, height: 200, kind: "keep-inside" },
    ],
  },
];

export const CUSTOM_PRESET: BannerPreset = {
  key: "custom",
  platform: "Custom",
  label: "Custom size",
  width: 1600,
  height: 400,
  note: "Any dimensions you need.",
  safeZones: [],
};

export function presetByKey(key: string) {
  return BANNER_PRESETS.find((p) => p.key === key) ?? CUSTOM_PRESET;
}
