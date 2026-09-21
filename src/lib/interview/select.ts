import {
  FAMILY_KEYWORDS, QUESTION_BANK, QUESTION_SECTIONS,
  type BankQuestion, type QuestionSection, type RoleFamily,
} from "@/lib/interview/bank";
import { ANSWERS } from "@/lib/interview/answers";

export const TOTAL_QUESTIONS = 100;
export const COUNT_MIN = 20;
export const COUNT_MAX = 100;
export const COUNT_STEP = 20;

export function clampCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return COUNT_MAX;
  const stepped = Math.round(n / COUNT_STEP) * COUNT_STEP;
  return Math.min(COUNT_MAX, Math.max(COUNT_MIN, stepped));
}

/* Stable id from the text so "questions I have not seen" survives restarts and
   regenerations. Editing a question's wording retires its old id, which is the
   behaviour we want — a reworded question is effectively a new one. */
export function questionId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/* Section quotas add up to TOTAL_QUESTIONS. Behavioural and role-specific carry
   the most weight because that is where most interviews are actually decided. */
const QUOTA: Record<QuestionSection, number> = {
  motivation: 16,
  behavioural: 24,
  role: 20,
  technical: 20,
  "working-style": 12,
  closing: 8,
};

export type PickedQuestion = {
  id: string;
  text: string;
  prompt?: string;
  answer?: string;
  section: QuestionSection;
};

export type QuestionSet = {
  family: RoleFamily;
  sections: { section: QuestionSection; questions: PickedQuestion[] }[];
  total: number;
  aiCount: number;
  ids: string[];
  exhausted: boolean;
};

export function detectFamily(jobTitle: string, jobDescription = ""): RoleFamily {
  const hay = `${jobTitle} ${jobDescription}`.toLowerCase();
  let best: { family: RoleFamily; score: number } = { family: "general", score: 0 };

  for (const { family, words } of FAMILY_KEYWORDS) {
    for (const word of words) {
      if (!hay.includes(word)) continue;
      /* Longer keywords are more specific, so "data engineer" beats "engineer". */
      if (word.length > best.score) best = { family, score: word.length };
    }
  }

  return best.family;
}

function fill(text: string, role: string, company: string) {
  return text
    .replaceAll("{role}", role || "this role")
    .replaceAll("{company}", company || "the company");
}

/* Deterministic shuffle so the same application always produces the same paper —
   regenerating after a tweak should not reshuffle a document you are annotating. */
function seededOrder<T>(items: T[], seed: number): T[] {
  return items
    .map((item, i) => ({ item, key: Math.sin(seed + i * 12.9898) * 43758.5453 }))
    .sort((a, b) => (a.key % 1) - (b.key % 1))
    .map((x) => x.item);
}

function seedFrom(text: string) {
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) % 100000;
  return seed;
}

export function buildQuestionSet(opts: {
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  extra?: { text: string; section: QuestionSection }[];
  count?: number;
  exclude?: string[];
}): QuestionSet {
  const family = detectFamily(opts.jobTitle, opts.jobDescription ?? "");
  const seed = seedFrom(`${opts.companyName}|${opts.jobTitle}`);
  const count = clampCount(opts.count ?? COUNT_MAX);
  const excluded = new Set(opts.exclude ?? []);

  const toPicked = (q: BankQuestion): PickedQuestion => {
    const text = fill(q.text, opts.jobTitle, opts.companyName);
    const answer = ANSWERS[q.text];
    return {
      id: questionId(q.text),
      text,
      prompt: q.prompt ? fill(q.prompt, opts.jobTitle, opts.companyName) : undefined,
      answer: answer ? fill(answer, opts.jobTitle, opts.companyName) : undefined,
      section: q.section,
    };
  };

  const aiBySection = new Map<QuestionSection, PickedQuestion[]>();
  for (const item of opts.extra ?? []) {
    if (excluded.has(questionId(item.text))) continue;
    const list = aiBySection.get(item.section) ?? [];
    list.push({
      id: questionId(item.text),
      text: fill(item.text, opts.jobTitle, opts.companyName),
      section: item.section,
    });
    aiBySection.set(item.section, list);
  }

  /* Quotas scale with the requested count and are corrected so the parts sum
     back to the whole after rounding. */
  const scaled = QUESTION_SECTIONS.map((section) => ({
    section,
    quota: Math.max(1, Math.round((QUOTA[section] * count) / TOTAL_QUESTIONS)),
  }));
  let drift = count - scaled.reduce((n, x) => n + x.quota, 0);
  for (let i = 0; drift !== 0 && i < scaled.length * 4; i++) {
    const entry = scaled[i % scaled.length];
    if (drift > 0) { entry.quota += 1; drift -= 1; }
    else if (entry.quota > 1) { entry.quota -= 1; drift += 1; }
  }

  const orderedPool = (section: QuestionSection): BankQuestion[] => [
    ...QUESTION_BANK.filter((q) => q.section === section && q.family === family),
    ...seededOrder(QUESTION_BANK.filter((q) => q.section === section && !q.family), seed),
    ...QUESTION_BANK.filter((q) => q.section === section && q.family && q.family !== family),
  ];

  const usedIds = new Set<string>();
  const sections = scaled.map(({ section, quota }) => {
    const ai = (aiBySection.get(section) ?? []).slice(0, quota);
    for (const q of ai) usedIds.add(q.id);

    const fresh = orderedPool(section)
      .map(toPicked)
      .filter((q) => !excluded.has(q.id) && !usedIds.has(q.id))
      .slice(0, Math.max(0, quota - ai.length));
    for (const q of fresh) usedIds.add(q.id);

    return { section, questions: [...ai, ...fresh] };
  });

  /* Top up from any section that still has unseen questions, then — only if the
     bank is genuinely exhausted — allow previously seen ones back in so the
     caller still gets the number it asked for. */
  let exhausted = false;
  const topUp = (allowSeen: boolean) => {
    let shortfall = count - sections.reduce((n, s) => n + s.questions.length, 0);
    if (shortfall <= 0) return;

    for (const entry of sections) {
      if (shortfall <= 0) break;
      const spare = seededOrder(orderedPool(entry.section), seed + 7)
        .map(toPicked)
        .filter((q) => !usedIds.has(q.id) && (allowSeen || !excluded.has(q.id)));

      const take = spare.slice(0, shortfall);
      for (const q of take) usedIds.add(q.id);
      entry.questions.push(...take);
      shortfall -= take.length;
    }
  };

  topUp(false);
  if (sections.reduce((n, s) => n + s.questions.length, 0) < count) {
    exhausted = excluded.size > 0;
    topUp(true);
  }

  return {
    family,
    sections,
    total: sections.reduce((n, s) => n + s.questions.length, 0),
    aiCount: (opts.extra ?? []).length,
    ids: sections.flatMap((s) => s.questions.map((q) => q.id)),
    exhausted,
  };
}
