import type { APPLICATION_STATUSES } from "@/constants/applicationStatus";

export interface Application {
  _id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  platform?: string;
  platformDetail?: string;
  applicationType?: string;
  submissionMethod?: string;
  applicationStatus: (typeof APPLICATION_STATUSES)[number];
  responseStatus?: string;
  country?: string;
  city?: string;
  location?: string;
  contactNumber?: string;
  salary?: string;
  salaryType?: "fixed" | "range";
  salaryCurrency?: "EUR" | "USD" | "BDT";
  salaryFixed?: number;
  salaryMin?: number;
  salaryMax?: number;
  jobPostUrl?: string;
  appliedDate?: Date;
  notes?: string;
  submittedDocuments?: string[];
  followUpDate?: Date;
  priority?: "Low" | "Medium" | "High";
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}
