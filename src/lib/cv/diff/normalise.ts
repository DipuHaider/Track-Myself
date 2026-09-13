/**
 * Extraction noise, removed before anything is compared.
 *
 * The left side of a review diff is text pulled out of a PDF or .docx, so it carries
 * line breaks, hyphenation and page furniture that the right side — built from
 * CVContent — never has. Every one of those would otherwise read as a content change.
 */

const FURNITURE = [
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^\d+$/,
  /^[-–—_=*·•]+$/,
];

export function normaliseForDiff(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "")
    .replace(/(\p{L})-\n(\p{L})/gu, "$1$2")
    .replace(/[   ]/g, " ")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .split("\n")
    .map((l) => l.replace(/^\s*[•▪◦‣·*\-–—]\s+/, "").replace(/[ \t]+/g, " ").trim());

  /* A header or footer repeated on every page is furniture, not content. */
  const seen = new Map<string, number>();
  for (const l of lines) if (l) seen.set(l, (seen.get(l) ?? 0) + 1);

  return lines
    .filter((l) => !FURNITURE.some((re) => re.test(l)))
    .filter((l) => !(l.length < 80 && (seen.get(l) ?? 0) >= 3))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * What two tokens are compared on. The surface form is what gets rendered, so
 * "Engineer," and "Engineer" stop being a difference without losing the comma.
 */
export function tokenKey(token: string): string {
  return token
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}
