import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).catch("");

export const tailorOutputSchema = z.object({
  positioning: text(120),
  summary: text(2000),
  summaryShort: text(600),
  skills: z
    .array(z.object({ label: text(80), items: text(1000) }).passthrough())
    .catch([]),
});

export const gapItemsSchema = z.array(
  z.object({
    requirement: z.string().trim().min(3).max(300),
    excerpt: text(400),
    level: z.enum(["required", "preferred", "unclear"]).catch("unclear"),
    verdict: z.enum(["match", "partial", "not-evidenced", "unclear"]).catch("unclear"),
    evidence: z.array(z.string()).catch([]),
    suggestion: text(400),
    question: text(300),
  }),
);

export const salaryEstimateSchema = z
  .object({
    low: z.coerce.number().positive(),
    high: z.coerce.number().positive(),
    note: text(300),
  })
  .refine((v) => v.low <= v.high && v.high <= v.low * 5, "range is implausible");

export const coverLetterSchema = z.object({
  greeting: text(200),
  paragraphs: z.array(z.string().trim().min(1).max(2000)).min(1).max(8),
  closing: text(200),
});

export const interviewQuestionsSchema = z.array(
  z.object({ q: z.string().trim().min(10).max(300), s: z.string().trim().max(40).catch("role") }),
);

export const reportAdviceSchema = z.array(z.string().trim().min(1).max(240)).min(1).max(5);

export const triageSuggestionsSchema = (n: number) => z.array(z.string().trim().max(200)).length(n);

const HEX = /^#[0-9a-f]{6}$/i;
export const bannerBriefSchema = z.object({
  headline: text(80),
  subheadline: text(120),
  tagline: text(160),
  keywords: z.array(z.string().trim().max(30)).catch([]),
  palette: z
    .object({
      background: z.string().regex(HEX).optional(),
      backgroundAlt: z.string().regex(HEX).optional(),
      accent: z.string().regex(HEX).optional(),
      text: z.string().regex(HEX).optional(),
      muted: z.string().regex(HEX).optional(),
    })
    .partial()
    .catch({}),
  style: text(20),
  layout: text(20),
});

/* Models wrap JSON in prose or fences often enough that the first balanced
   block is taken rather than the whole reply. Fenced code wins when present. */
export function extractJson(raw: string, kind: "object" | "array"): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidates = [fenced, raw].filter((s): s is string => typeof s === "string");
  const open = kind === "object" ? "{" : "[";
  const close = kind === "object" ? "}" : "]";

  for (const source of candidates) {
    const start = source.indexOf(open);
    const end = source.lastIndexOf(close);
    if (start === -1 || end === -1 || end <= start) continue;
    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch {
      continue;
    }
  }
  return null;
}
