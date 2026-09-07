import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import type { CVFileCategory } from "@/types/cv";

export const DOC_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const CATEGORY_MIME: Record<CVFileCategory, string[]> = {
  "cv":            DOC_MIME_TYPES,
  "resume":        DOC_MIME_TYPES,
  "cover-letter":  DOC_MIME_TYPES,
  "certificate":   [...DOC_MIME_TYPES, ...IMAGE_MIME_TYPES],
  "profile-photo": IMAGE_MIME_TYPES,
  "cover-image":   IMAGE_MIME_TYPES,
  "other":         [...DOC_MIME_TYPES, ...IMAGE_MIME_TYPES],
};

export const CATEGORY_MAX_BYTES: Record<CVFileCategory, number> = {
  "cv":            5 * 1024 * 1024,
  "resume":        5 * 1024 * 1024,
  "cover-letter":  5 * 1024 * 1024,
  "certificate":   5 * 1024 * 1024,
  "profile-photo": 3 * 1024 * 1024,
  "cover-image":   6 * 1024 * 1024,
  "other":         5 * 1024 * 1024,
};

export const PRIMARY_FOR_CATEGORY: Partial<Record<CVFileCategory, string>> = {
  "cv":            "cv",
  "resume":        "resume",
  "cover-letter":  "coverLetter",
  "profile-photo": "profilePhoto",
  "cover-image":   "coverImage",
};

export type CVFileMetaRow = {
  _id: string;
  name: string;
  size: number;
  mimeType: string;
  category: CVFileCategory;
  uploadedAt?: string;
};

type LegacyFile = {
  _id: unknown;
  name: string;
  size: number;
  mimeType: string;
  data: string;
  uploadedAt?: Date;
};

export async function migrateLegacyCVFiles(userId: string) {
  const hasLegacy = await CVProfile.exists({ userId, "uploadedFiles.0": { $exists: true } });
  if (!hasLegacy) return;

  const profile = (await CVProfile.findOne(
    { userId },
    { uploadedFiles: 1 },
  ).lean()) as unknown as { uploadedFiles?: LegacyFile[] } | null;

  for (const file of profile?.uploadedFiles ?? []) {
    const exists = await CVFile.exists({ _id: file._id });
    if (exists) continue;
    await CVFile.create({
      _id: file._id,
      userId,
      category: "cv",
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      data: file.data,
      uploadedAt: file.uploadedAt ?? new Date(),
    });
  }

  await CVProfile.updateOne({ userId }, { $set: { uploadedFiles: [] } });
}

export async function listCVFiles(userId: string) {
  await migrateLegacyCVFiles(userId);
  return CVFile.find({ userId }, { data: 0 }).sort({ uploadedAt: 1 }).lean();
}

export async function readCVFile(userId: string, id: string) {
  if (!id) return null;
  return CVFile.findOne({ _id: id, userId }).lean() as Promise<
    ({ name: string; mimeType: string; data: string } & Record<string, unknown>) | null
  >;
}

export async function readPhotoDataUri(userId: string, id: string) {
  const file = await readCVFile(userId, id);
  if (!file?.data) return "";
  return `data:${file.mimeType};base64,${file.data}`;
}
