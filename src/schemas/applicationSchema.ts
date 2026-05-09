import { z } from "zod";

export const applicationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  platform: z.string().optional(),
  applicationType: z.string().optional(),
  applicationStatus: z.string().min(1, "Status is required"),
  country: z.string().optional(),
  salary: z.string().optional(),
  jobPostUrl: z.union([z.string().url(), z.literal("")]).optional(),
  appliedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;
