import { z } from "zod";
import { JOB_SOURCES } from "@/lib/jobs/constants";

const SEARCH_URL_HOSTS = /(^|\.)(linkedin\.com|xing\.com|stepstone\.de)$/i;

const searchUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((raw) => {
    try {
      const u = new URL(raw);
      return u.protocol === "https:" && SEARCH_URL_HOSTS.test(u.hostname);
    } catch {
      return false;
    }
  }, "Saved-search links must be https links on linkedin.com, xing.com or stepstone.de.");

export const jobSearchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  keywords: z.string().trim().min(2).max(200),
  location: z.string().trim().max(120).default(""),
  radiusKm: z.number().int().min(0).max(200).default(25),
  remote: z.boolean().default(false),
  sources: z.array(z.enum(JOB_SOURCES)).min(1).max(JOB_SOURCES.length).default(["ba", "adzuna"]),
  maxAgeDays: z.number().int().min(1).max(14).default(3),
  excludeCompanies: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  extensionUrls: z.array(searchUrl).max(10).default([]),
  active: z.boolean().default(true),
});

export const jobSearchPatchSchema = jobSearchSchema.partial();

export type JobSearchInput = z.infer<typeof jobSearchSchema>;

export const JOB_SEARCH_LIMIT = 10;
