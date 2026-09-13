import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import { importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import { extractCVText, jsonFromBuffer } from "./extractText";
import { parseCV } from "./parseText";
import { mergeCVSources, type MergeSource } from "./merge";
import type { CVContent } from "@/types/cv";

/**
 * Assembles every CV data source an account has, in the order the pipeline expects:
 *
 *   uploaded CVs (weight 1) → JSON, uploaded or pasted (2) → the CV Builder form (3)
 *
 * The form always wins, so reading an old uploaded CV can only fill gaps — it can
 * never overwrite something the user typed.
 */

/* Parsing a PDF is not free, so cap what one generation will read. */
const MAX_FILES = 5;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

type ProfileDoc = {
  content?: unknown;
  jsonImports?: { label: string; content: unknown; at?: Date }[];
  primary?: { cv?: string };
} & Record<string, unknown>;

type FileDoc = {
  _id: unknown;
  name: string;
  mimeType: string;
  data: string;
  category: string;
  parsedText?: string;
  uploadedAt?: Date;
};

function isJsonFile(file: { name: string; mimeType: string }) {
  return file.mimeType === "application/json" || file.name.toLowerCase().endsWith(".json");
}

export type SourceReport = {
  label: string;
  kind: "file" | "json" | "form";
  ok: boolean;
  detail: string;
};

/** Reads one stored CV file and returns its text, caching the result on the document. */
export async function textForFile(file: FileDoc): Promise<{ text: string; cached: boolean } | null> {
  if (file.parsedText && file.parsedText.trim()) {
    return { text: file.parsedText, cached: true };
  }

  const buf = Buffer.from(file.data, "base64");
  if (buf.length > MAX_FILE_BYTES) return null;

  const res = await extractCVText(buf, file.mimeType, file.name);
  if (!res.ok) return null;

  await CVFile.updateOne({ _id: file._id }, { $set: { parsedText: res.text, parsedAt: new Date() } });
  return { text: res.text, cached: false };
}

export async function gatherCVSources(
  userId: string,
  opts: { includeJson?: boolean; formContent?: CVContent } = {},
): Promise<{ sources: MergeSource[]; report: SourceReport[] }> {
  const sources: MergeSource[] = [];
  const report: SourceReport[] = [];

  const profile = (await CVProfile.findOne(
    { userId },
    { uploadedFiles: 0 },
  ).lean()) as ProfileDoc | null;

  /* ── 1. uploaded CVs ── */
  /* Take the newest MAX_FILES, then flip to oldest-first: the cap has to keep
     what was uploaded most recently, while the merge still lets a newer file win. */
  const files = (await CVFile.find(
    /* generated: never — feeding our own output back in would be circular */
    { userId, category: { $in: ["cv", "resume"] }, generated: { $ne: true } },
    "name mimeType data category parsedText uploadedAt",
  )
    .sort({ uploadedAt: -1 })
    .limit(MAX_FILES)
    .lean()) as unknown as FileDoc[];
  files.reverse();

  const primaryId = String(profile?.primary?.cv ?? "");

  for (const file of files) {
    /* An uploaded .json is already the shape the builders render, so it is read
       structurally and ranked with the pasted JSON versions rather than being
       run through the heuristic text parser. */
    if (isJsonFile(file)) {
      const got = jsonFromBuffer(Buffer.from(file.data, "base64"));
      if (!got.ok) {
        report.push({ label: file.name, kind: "json", ok: false, detail: got.reason });
        continue;
      }
      const content = normaliseContent(got.value);
      if (isContentEmpty(content)) {
        report.push({ label: file.name, kind: "json", ok: false, detail: "no CV fields found" });
        continue;
      }
      sources.push({
        label: file.name,
        content,
        weight: String(file._id) === primaryId ? 2.5 : 2,
      });
      report.push({ label: file.name, kind: "json", ok: true, detail: "structured upload" });
      continue;
    }

    const got = await textForFile(file);
    if (!got) {
      report.push({ label: file.name, kind: "file", ok: false, detail: "could not be read" });
      continue;
    }
    const parsed = await parseCV(got.text);
    if (isContentEmpty(parsed.content)) {
      report.push({ label: file.name, kind: "file", ok: false, detail: "no CV fields found" });
      continue;
    }
    /* the starred Main CV outranks the other uploads */
    const weight = String(file._id) === primaryId ? 1.5 : 1;
    sources.push({ label: file.name, content: parsed.content, weight });
    report.push({
      label: file.name,
      kind: "file",
      ok: true,
      detail: `${parsed.found.join(", ") || "nothing"}${got.cached ? "" : " (parsed now)"}`,
    });
  }

  /* ── 2. imported JSON ── */
  if (opts.includeJson && Array.isArray(profile?.jsonImports)) {
    profile.jsonImports.forEach((entry, i) => {
      const content = normaliseContent(entry.content);
      if (isContentEmpty(content)) return;
      sources.push({ label: entry.label || `JSON ${i + 1}`, content, weight: 2 });
      report.push({ label: entry.label || `JSON ${i + 1}`, kind: "json", ok: true, detail: "structured import" });
    });
  }

  /* ── 3. the CV Builder form — always the strongest ── */
  let form = opts.formContent ?? normaliseContent(profile?.content);
  if (isContentEmpty(form) && profile) form = importFromLegacy(profile as never);
  if (!isContentEmpty(form)) {
    sources.push({ label: "CV Builder", content: form, weight: 3 });
    report.push({ label: "CV Builder", kind: "form", ok: true, detail: "typed details" });
  }

  return { sources, report };
}

/** The whole cascade in one call. */
export async function buildMergedCV(
  userId: string,
  opts: { includeJson?: boolean; formContent?: CVContent } = {},
) {
  const { sources, report } = await gatherCVSources(userId, opts);
  if (!sources.length) return { content: null, report, usedFrom: {} };
  const { content, usedFrom } = mergeCVSources(sources);
  return { content, report, usedFrom };
}
