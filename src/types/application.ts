import type { APPLICATION_STATUSES } from "@/constants/applicationStatus";

export interface Application {
  _id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  platform?: string;
  applicationType?: string;
  submissionMethod?: string;
  applicationStatus: (typeof APPLICATION_STATUSES)[number];
  responseStatus?: string;
  country?: string;
  salary?: string;
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
