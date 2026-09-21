import dbConnect from "@/lib/db";
import AppSettings from "@/models/AppSettings";

export type AppFeatureSettings = {
  tourEnabled: boolean;
};

export const APP_SETTINGS_DEFAULTS: AppFeatureSettings = {
  tourEnabled: true,
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
      | { tourEnabled?: boolean }
      | null;

    const value: AppFeatureSettings = {
      tourEnabled: doc?.tourEnabled !== false,
    };
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return APP_SETTINGS_DEFAULTS;
  }
}

export async function saveAppSettings(
  patch: Partial<AppFeatureSettings>,
  updatedBy: string,
): Promise<AppFeatureSettings> {
  await dbConnect();
  const update: Record<string, unknown> = { updatedBy };
  if (typeof patch.tourEnabled === "boolean") update.tourEnabled = patch.tourEnabled;

  const doc = await AppSettings.findOneAndUpdate({ key: "default" }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).lean();

  invalidateAppSettings();
  return { tourEnabled: (doc as { tourEnabled?: boolean } | null)?.tourEnabled !== false };
}
