import CVFile from "@/models/CVFile";
import { DOCX_MIME } from "@/lib/cv/docx";
import { PDF_MIME } from "@/lib/cv/pdf";

/* How many generated documents the library keeps before trimming the oldest. */
export const GENERATED_KEEP = 60;
const MAX_BYTES = 6 * 1024 * 1024;

export type GeneratedSpec = {
  userId: string;
  buffer: Buffer;
  filename: string;
  format: string;
  variant: string;
  docType: "cv" | "resume" | "cover-letter";
  genFor: string;
  isoDate: string;
  snapshot: string;
  genTailor?: string;
  genNote?: string;
  applicationId?: string;
};

/* Upserted on a stable signature so generating the same document twice in a
   day replaces the entry instead of stacking duplicates. genDate is part of
   the signature, so day folders keep real history, and the library trims its
   own tail because generated rows are exempt from the upload cap. */
export async function saveGeneratedFile(spec: GeneratedSpec): Promise<string | null> {
  if (spec.buffer.length >= MAX_BYTES) return null;
  const isPdf = spec.filename.endsWith(".pdf");
  const output = isPdf ? "pdf" : "docx";
  const row = (await CVFile.findOneAndUpdate(
    {
      userId: spec.userId,
      generated: true,
      genFormat: spec.format,
      genVariant: spec.variant,
      genDocType: spec.docType,
      genOutput: output,
      genFor: spec.genFor,
      genDate: spec.isoDate,
    },
    {
      $set: {
        userId: spec.userId,
        category: spec.docType === "cover-letter" ? "cover-letter" : spec.docType === "resume" ? "resume" : "cv",
        name: spec.filename,
        size: spec.buffer.length,
        mimeType: isPdf ? PDF_MIME : DOCX_MIME,
        data: spec.buffer.toString("base64"),
        generated: true,
        genFormat: spec.format,
        genVariant: spec.variant,
        genDocType: spec.docType,
        genOutput: output,
        genFor: spec.genFor,
        genContent: spec.snapshot,
        genContentAt: new Date(),
        genDate: spec.isoDate,
        genTailor: spec.genTailor ?? "",
        genNote: (spec.genNote ?? "").slice(0, 2000),
        genEdited: false,
        uploadedAt: new Date(),
        ...(spec.applicationId ? { applicationId: spec.applicationId } : {}),
      },
    },
    { upsert: true, new: true, projection: { _id: 1 } },
  ).lean()) as { _id: unknown } | null;

  const extra = (await CVFile.countDocuments({ userId: spec.userId, generated: true })) - GENERATED_KEEP;
  if (extra > 0) {
    const oldest = (await CVFile.find({ userId: spec.userId, generated: true }, { _id: 1 })
      .sort({ uploadedAt: 1 }).limit(extra).lean()) as unknown as { _id: unknown }[];
    if (oldest.length) await CVFile.deleteMany({ _id: { $in: oldest.map((f) => f._id) } });
  }
  return row ? String(row._id) : null;
}
