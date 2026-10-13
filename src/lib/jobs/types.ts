import type { LeadSource } from "@/lib/jobs/constants";

export type SearchQuery = {
  keywords: string;
  location: string;
  radiusKm: number;
  maxAgeDays: number;
  remote: boolean;
};

export type RawLead = {
  source: LeadSource;
  externalId: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  applyUrl?: string;
  postedAt?: Date | null;
  postedAgeText?: string;
  deadline?: Date | null;
  description?: string;
  salary?: string;
  remote?: boolean;
};

export type LeadDraft = Required<Omit<RawLead, "postedAt" | "deadline">> & {
  postedAt: Date | null;
  deadline: Date | null;
  platform: string;
  identity: string;
  matchKey: string;
  city: string;
  country: string;
};

export type SourceResult = { leads: RawLead[]; errors: string[] };
