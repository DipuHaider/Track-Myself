import { createHash } from "node:crypto";
import { z } from "zod";
import { toLeadDraft } from "@/lib/jobs/normalise";
import type { LeadDraft } from "@/lib/jobs/types";

const httpUrl = z.string().trim().max(2048).refine((u) => {
  try {
    const p = new URL(u).protocol;
    return p === "https:" || p === "http:";
  } catch {
    return false;
  }
}, "Links must be http or https.");
const isoDate = z.string().trim().max(40).optional().nullable();

export const ingestLeadSchema = z.object({
  title: z.string().trim().min(1).max(300),
  company: z.string().trim().min(1).max(200),
  url: httpUrl,
  applyUrl: httpUrl.optional(),
  location: z.string().trim().max(200).optional(),
  description: z.string().max(24_000).optional(),
  postedAt: isoDate,
  postedAgeText: z.string().trim().max(60).optional(),
  deadline: isoDate,
  salary: z.string().trim().max(200).optional(),
  remote: z.boolean().optional(),
  externalId: z.string().trim().max(200).optional(),
});

export const INGEST_SOURCES = ["manual", "email-alert", "linkedin", "xing", "stepstone", "indeed"] as const;

export const ingestBatchSchema = z.object({
  source: z.enum(INGEST_SOURCES).default("manual"),
  leads: z.array(ingestLeadSchema).min(1).max(50),
});

export type IngestLeadInput = z.infer<typeof ingestLeadSchema>;

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function externalIdFor(input: Pick<IngestLeadInput, "externalId" | "url">): string {
  if (input.externalId) return input.externalId;
  return createHash("sha1").update(input.url).digest("hex").slice(0, 24);
}

export function draftsFromInput(
  source: (typeof INGEST_SOURCES)[number],
  leads: IngestLeadInput[],
  now = new Date(),
): LeadDraft[] {
  return leads
    .map((l) => toLeadDraft({
      source,
      externalId: externalIdFor(l),
      title: l.title,
      company: l.company,
      location: l.location,
      url: l.url,
      applyUrl: l.applyUrl,
      postedAt: parseDate(l.postedAt),
      postedAgeText: l.postedAgeText,
      deadline: parseDate(l.deadline),
      description: l.description,
      salary: l.salary,
      remote: l.remote,
    }, now))
    .filter((d): d is LeadDraft => d !== null);
}
