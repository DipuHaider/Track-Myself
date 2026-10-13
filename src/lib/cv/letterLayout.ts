/* projects is the short "Relevant projects" list; it prints before the last
   paragraph so the letter still ends on the call to action. */
export type CoverLetterText = {
  greeting: string;
  paragraphs: string[];
  projects?: string[];
  closing: string;
};

export const PROJECTS_HEADING = "Relevant projects";

export type LetterBlock = { kind: "paragraph"; text: string } | { kind: "projects"; items: string[] };

export function letterBlocks(letter: CoverLetterText): LetterBlock[] {
  const paras: LetterBlock[] = letter.paragraphs.map((text) => ({ kind: "paragraph", text }));
  const items = (letter.projects ?? []).map((i) => i.trim()).filter(Boolean);
  if (!items.length) return paras;
  const at = paras.length > 1 ? paras.length - 1 : paras.length;
  return [...paras.slice(0, at), { kind: "projects", items }, ...paras.slice(at)];
}

export function letterPlainText(letter: CoverLetterText): string {
  const body = letterBlocks(letter).map((b) =>
    b.kind === "paragraph" ? b.text : `${PROJECTS_HEADING}:\n${b.items.map((i) => `• ${i}`).join("\n")}`,
  );
  return [letter.greeting, ...body, letter.closing].filter(Boolean).join("\n\n");
}
