import zlib from "node:zlib";

/**
 * Pulls plain text out of an uploaded CV so it can be parsed into CVContent.
 *
 *   .docx  read here with zlib — a .docx is a zip and the text lives in word/document.xml
 *   .pdf   unpdf (pdf.js), which is built for serverless
 *   .doc   word-extractor, for the legacy binary format
 *   .md    stripped of its syntax, so the parser sees ordinary lines
 *   .json  handed back as-is for the caller to read structurally
 *
 * Returns text with paragraph breaks preserved, because the parser leans on line
 * structure to tell a job title from a bullet.
 */

export type ExtractResult =
  | { ok: true; text: string; source: "docx" | "pdf" | "doc" | "text" | "markdown" | "json" }
  | { ok: false; reason: string };

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";
const PDF_MIME = "application/pdf";
const MD_MIMES = ["text/markdown", "text/x-markdown"];
const JSON_MIME = "application/json";

/* ── .docx ── */

function zipEntry(buf: Buffer, wanted: string): Buffer | null {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) return null;
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.subarray(off + 46, off + 46 + nameLen).toString("latin1");

    if (name === wanted) {
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      return method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

export function textFromDocx(buf: Buffer): ExtractResult {
  let xmlBuf: Buffer | null;
  try {
    xmlBuf = zipEntry(buf, "word/document.xml");
  } catch {
    return { ok: false, reason: "That .docx could not be opened — it may be corrupt." };
  }
  if (!xmlBuf) return { ok: false, reason: "That file is not a readable .docx." };

  const xml = xmlBuf.toString("utf8");
  const body = xml.slice(xml.indexOf("<w:body"));

  const lines: string[] = [];
  /* one <w:p> is one paragraph; <w:tab/> and <w:br/> become separators inside it */
  for (const [, para] of body.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g).map((m) => [null, m[0]] as const)) {
    const withBreaks = para
      .replace(/<w:tab\b[^>]*\/?>/g, "\t")
      .replace(/<w:br\b[^>]*\/?>/g, "\n");
    const runs = [...withBreaks.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    const text = decodeXmlEntities(runs.join("")).replace(/ /g, " ").trim();
    if (text) lines.push(text);
  }

  if (!lines.length) return { ok: false, reason: "That .docx has no readable text." };
  return { ok: true, text: lines.join("\n"), source: "docx" };
}

/* ── .pdf ── */

export async function textFromPdf(buf: Buffer): Promise<ExtractResult> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = String(text).replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
    if (!cleaned) {
      return {
        ok: false,
        reason: "That PDF has no selectable text — it is probably a scan. Upload a .docx, or fill the form.",
      };
    }
    return { ok: true, text: cleaned, source: "pdf" };
  } catch {
    return { ok: false, reason: "That PDF could not be read." };
  }
}

/* ── legacy .doc ── */

export async function textFromDoc(buf: Buffer): Promise<ExtractResult> {
  try {
    const { default: WordExtractor } = await import("word-extractor");
    const doc = await new WordExtractor().extract(buf);
    const text = doc.getBody().replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) return { ok: false, reason: "That .doc has no readable text." };
    return { ok: true, text, source: "doc" };
  } catch {
    return { ok: false, reason: "That .doc could not be read. Save it as .docx and try again." };
  }
}

/* ── .md ── */

/**
 * Flattens Markdown to the line-structured plain text the parser expects.
 *
 * Bullets are left alone — `- ` and `* ` are already what BULLET_RE looks for —
 * and `#` markers are stripped so a "## Experience" line lands on the heading
 * aliases. Link text and its URL are both kept, because a CV's links are data.
 */
export function textFromMarkdown(buf: Buffer): ExtractResult {
  const src = buf.toString("utf8").replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;
  let inFrontMatter = false;

  for (let i = 0; i < src.length; i++) {
    let line = src[i];

    if (i === 0 && /^---\s*$/.test(line)) { inFrontMatter = true; continue; }
    if (inFrontMatter) {
      if (/^(---|\.\.\.)\s*$/.test(line)) { inFrontMatter = false; continue; }
      out.push(line.replace(/^\s*-\s+/, "").trim());
      continue;
    }

    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    /* Fenced code is never CV data — keeping it turned a Python snippet into
       "def bernoulli(n)" as a skill group label. */
    if (inFence) continue;

    /* a horizontal rule or a setext underline carries no text of its own */
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) continue;
    if (/^\s*=+\s*$/.test(line)) continue;

    line = line
      .replace(/^\s{0,3}#{1,6}\s+/, "")
      .replace(/^\s*>\s?/, "")
      .replace(/^(\s*)\d+\.\s+/, "$1- ");

    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;
      line = line
        .replace(/^\s*\|/, "").replace(/\|\s*$/, "")
        .split("|").map((cell) => cell.trim()).join("\t");
    }

    line = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, "$1 $2")
      .replace(/<(https?:\/\/[^>]+)>/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(?<![\w*])([*_])(?=\S)(.+?)(?<=\S)\1(?![\w*])/g, "$2")
      .replace(/~~.+?~~/g, "")
      .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1");

    out.push(line.trimEnd());
  }

  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return { ok: false, reason: "That Markdown file has no readable text." };
  return { ok: true, text, source: "markdown" };
}

/* ── .json ── */

/** Parses a stored .json file. The caller decides what the shape means. */
export function jsonFromBuffer(
  buf: Buffer,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const raw = buf.toString("utf8").trim();
  if (!raw) return { ok: false, reason: "That file is empty." };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, reason: "That .json file is not valid JSON." };
  }
}

/* ── dispatch ── */

export async function extractCVText(
  buf: Buffer,
  mimeType: string,
  filename = "",
): Promise<ExtractResult> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (mimeType === DOCX_MIME || ext === "docx") return textFromDocx(buf);
  if (mimeType === PDF_MIME || ext === "pdf") return textFromPdf(buf);
  if (mimeType === DOC_MIME || ext === "doc") return textFromDoc(buf);
  if (MD_MIMES.includes(mimeType) || ext === "md" || ext === "markdown") return textFromMarkdown(buf);
  if (mimeType === JSON_MIME || ext === "json") {
    const got = jsonFromBuffer(buf);
    return got.ok
      ? { ok: true, text: JSON.stringify(got.value, null, 2), source: "json" }
      : { ok: false, reason: got.reason };
  }
  if (mimeType.startsWith("text/") || ext === "txt") {
    const text = buf.toString("utf8").trim();
    return text
      ? { ok: true, text, source: "text" }
      : { ok: false, reason: "That file is empty." };
  }

  return {
    ok: false,
    reason: "Only .docx, .pdf, .doc, .md and .json CVs can be read. Images and scans cannot.",
  };
}
