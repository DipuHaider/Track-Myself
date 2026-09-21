import dbConnect from "@/lib/db";
import AppSettings from "@/models/AppSettings";

import type { TourScope } from "@/lib/tour";

export type AppFeatureSettings = {
  tours: Record<TourScope, boolean>;
};

export const APP_SETTINGS_DEFAULTS: AppFeatureSettings = {
  tours: { home: true, portal: true, dashboard: true },
};

const FIELD: Record<TourScope, "tourHome" | "tourPortal" | "tourDashboard"> = {
  home: "tourHome",
  portal: "tourPortal",
  dashboard: "tourDashboard",
};

const CACHE_TTL_MS = 60 * 1000;

let cached: { value: AppFeatureSettings; at: number } | null = null;

export function invalidateAppSettings() {
  cached = null;
}

export async function getAppSettings(): Promise<AppFeatureSettings> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    await dbConnect();
    const doc = (await AppSettings.findOne({ key: "default" }).lean()) as
      | { tourEnabled?: boolean; tourHome?: boolean; tourPortal?: boolean; tourDashboard?: boolean }
      | null;

    /* A doc written before the split only has tourEnabled; honour it as the
       baseline so an admin who turned tours off does not get them back on. */
    const legacy = doc?.tourEnabled !== false;
    const value: AppFeatureSettings = {
      tours: {
        home: doc?.tourHome ?? legacy,
        portal: doc?.tourPortal ?? legacy,
        dashboard: doc?.tourDashboard ?? legacy,
      },
    };
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return APP_SETTINGS_DEFAULTS;
  }
}

export async function saveAppSettings(
  patch: Partial<Record<TourScope, boolean>>,
  updatedBy: string,
): Promise<AppFeatureSettings> {
  await dbConnect();
  const update: Record<string, unknown> = { updatedBy };

  for (const scope of Object.keys(FIELD) as TourScope[]) {
    if (typeof patch[scope] === "boolean") update[FIELD[scope]] = patch[scope];
  }

  await AppSettings.findOneAndUpdate({ key: "default" }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).lean();

  invalidateAppSettings();
  return getAppSettings();
}
