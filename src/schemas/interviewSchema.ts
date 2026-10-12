import { z } from "zod";

export const INTERVIEW_STATUSES = ["Scheduled", "Completed", "Cancelled"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_STAGES = ["Written", "HR", "Technical", "Cultural Fit", "Final", "Other"] as const;

const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const interviewCreateSchema = z.object({
  stageName: z.string().trim().min(1, "Stage is required").max(120),
  status: z.enum(INTERVIEW_STATUSES).default("Scheduled"),
  scheduledDate: optionalDate,
  feedback: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export const interviewUpdateSchema = interviewCreateSchema.partial();

export type InterviewCreate = z.infer<typeof interviewCreateSchema>;
export type InterviewUpdate = z.infer<typeof interviewUpdateSchema>;
