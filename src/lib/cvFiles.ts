import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import type { CVFileCategory } from "@/types/cv";

export {
  DOC_MIME_TYPES, IMAGE_MIME_TYPES, DATA_MIME_TYPES, resolveFileMime,
  CATEGORY_MIME, CATEGORY_MAX_BYTES, PRIMARY_FOR_CATEGORY, fileTypeLabel,
} from "@/lib/cvFileTypes";

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
  return CVFile.find({ userId }, { data: 0, genContent: 0 }).sort({ uploadedAt: 1 }).lean();
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
