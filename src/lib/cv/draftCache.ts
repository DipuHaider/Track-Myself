import { createHash } from "crypto";
import CVFile from "@/models/CVFile";
import type { CVContent } from "@/types/cv";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type DraftKey = {
  userId: string;
  docType: string;
  format: string;
  variant: string;
  jobDescription: string;
  correction: string;
  baseline: CVContent;
};

/* Everything that would change the answer goes into the hash. The baseline is
   included because editing a CV must invalidate a draft built from the old one;
   the photo is excluded since a data URI would dominate the digest without
   affecting a word of the tailoring. */
export function draftHash(key: DraftKey): string {
  const baseline = JSON.stringify({ ...key.baseline, photo: "" });
  return createHash("sha256")
    .update([key.docType, key.format, key.variant, key.jobDescription, key.correction, baseline].join("\u0000"))
    .digest("hex")
    .slice(0, 32);
}

export async function findDraft(userId: string, hash: string): Promise<CVContent | null> {
  const row = (await CVFile.findOne(
    { userId, generated: true, genOutput: "preview", genInputHash: hash },
    "genContent genContentAt",
  ).lean()) as { genContent?: string; genContentAt?: Date } | null;

  if (!row?.genContent) return null;

  const age = Date.now() - new Date(row.genContentAt ?? 0).getTime();
  if (age > DRAFT_TTL_MS) return null;

  try {
    return JSON.parse(row.genContent) as CVContent;
  } catch {
    return null;
  }
}

/* Upserted on the hash, so regenerating the same request replaces the draft
   rather than stacking rows. */
export async function saveDraft(
  userId: string,
  hash: string,
  name: string,
  content: CVContent,
): Promise<void> {
  await CVFile.findOneAndUpdate(
    { userId, generated: true, genOutput: "preview", genInputHash: hash },
    {
      $set: {
        userId,
        category: "cv",
        name,
        generated: true,
        genOutput: "preview",
        genInputHash: hash,
        genContent: JSON.stringify({ ...content, photo: "" }),
        genContentAt: new Date(),
      },
    },
    { upsert: true },
  ).catch(() => {});
}
