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

/* Structured sources the CV pipeline can read as data rather than as a layout. */
export const DATA_MIME_TYPES = [
  "application/json",
  "text/markdown",
];

const EXT_MIME: Record<string, string> = {
  json: "application/json",
  md: "text/markdown",
  markdown: "text/markdown",
};

/* Browsers disagree about .md — Chrome on Windows sends text/plain, some send
   nothing at all — so the extension decides when the reported type is unhelpful. */
export function resolveFileMime(name: string, reported = "") {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const byExt = EXT_MIME[ext];
  if (!byExt) return reported;
  const vague = !reported || reported === "text/plain" || reported === "application/octet-stream";
  return vague || reported === "text/x-markdown" ? byExt : reported;
}

export const CATEGORY_MIME: Record<CVFileCategory, string[]> = {
  "cv":            [...DOC_MIME_TYPES, ...DATA_MIME_TYPES],
  "resume":        [...DOC_MIME_TYPES, ...DATA_MIME_TYPES],
  "cover-letter":  [...DOC_MIME_TYPES, ...DATA_MIME_TYPES],
  "certificate":   [...DOC_MIME_TYPES, ...IMAGE_MIME_TYPES],
  "profile-photo": IMAGE_MIME_TYPES,
  "cover-image":   IMAGE_MIME_TYPES,
  "other":         [...DOC_MIME_TYPES, ...IMAGE_MIME_TYPES, ...DATA_MIME_TYPES],
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

export function fileTypeLabel(mimeType: string, name = "") {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/msword") return "DOC";
  if (mimeType === "application/json") return "JSON";
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") return "MD";
  if (mimeType.startsWith("image/")) return mimeType.split("/")[1].toUpperCase();
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "json" || ext === "md" || ext === "markdown") return ext === "markdown" ? "MD" : ext.toUpperCase();
  return "DOCX";
}
