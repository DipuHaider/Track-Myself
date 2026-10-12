import { createHash } from "crypto";
import dbConnect from "@/lib/db";
import AiDraft from "@/models/AiDraft";
import type { CVContent } from "@/types/cv";
import { sanitizeLetter, type CoverLetterText } from "@/lib/cv/coverLetter";

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

type DraftKind = "cv-preview" | "cover-letter" | "interview-questions";

export function cacheKey(parts: (string | number | null | undefined)[]): string {
  return createHash("sha256").update(parts.map((p) => String(p ?? "")).join("\u0000")).digest("hex").slice(0, 32);
}

/* Everything that would change the answer goes into the hash. The baseline is
   included because editing a CV must invalidate a draft built from the old one;
   the photo is excluded since a data URI would dominate the digest without
   affecting a word of the tailoring. */
export function draftHash(key: DraftKey): string {
  const baseline = JSON.stringify({ ...key.baseline, photo: "" });
  return cacheKey([key.docType, key.format, key.variant, key.jobDescription, key.correction, baseline]);
}

async function read<T>(userId: string, kind: DraftKind, hash: string): Promise<T | null> {
  await dbConnect();
  const row = (await AiDraft.findOne({ userId, kind, hash }, "payload expiresAt").lean()) as
    | { payload?: string; expiresAt?: Date }
    | null;
  if (!row?.payload) return null;
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

async function write(userId: string, kind: DraftKind, hash: string, label: string, payload: unknown): Promise<void> {
  await dbConnect();
  await AiDraft.findOneAndUpdate(
    { userId, kind, hash },
    { $set: { label: label.slice(0, 160), payload: JSON.stringify(payload), expiresAt: new Date(Date.now() + DRAFT_TTL_MS) } },
    { upsert: true },
  ).catch(() => {});
}

export async function findDraft(userId: string, hash: string): Promise<CVContent | null> {
  return read<CVContent>(userId, "cv-preview", hash);
}

export async function saveDraft(userId: string, hash: string, name: string, content: CVContent): Promise<void> {
  await write(userId, "cv-preview", hash, name, { ...content, photo: "" });
}

export async function findLetterDraft(userId: string, hash: string): Promise<CoverLetterText | null> {
  const row = await read<{ coverLetter?: unknown }>(userId, "cover-letter", hash);
  if (!row?.coverLetter) return null;
  try {
    return sanitizeLetter(row.coverLetter);
  } catch {
    return null;
  }
}

export async function saveLetterDraft(userId: string, hash: string, name: string, letter: CoverLetterText): Promise<void> {
  await write(userId, "cover-letter", hash, name, { coverLetter: letter });
}

export type InterviewDraft = { text: string; section: string }[];

export async function findInterviewDraft(userId: string, hash: string): Promise<InterviewDraft | null> {
  const rows = await read<InterviewDraft>(userId, "interview-questions", hash);
  return Array.isArray(rows) ? rows : null;
}

export async function saveInterviewDraft(userId: string, hash: string, name: string, rows: InterviewDraft): Promise<void> {
  await write(userId, "interview-questions", hash, name, rows);
}
