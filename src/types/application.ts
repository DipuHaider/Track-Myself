import type { APPLICATION_STATUSES } from "@/constants/applicationStatus";

export interface SalaryExpectation {
  mode: "amount" | "range" | "negotiable" | "ask-budget";
  currency: "EUR" | "USD" | "BDT";
  period: "year" | "month";
  amount?: number | null;
  min?: number | null;
  max?: number | null;
  text?: string;
  inputs?: { current?: number | null; minimum?: number | null; raisePct?: number | null; period?: "year" | "month" };
  estimate?: { low: number; high: number; note?: string; at?: string | Date } | null;
}

export interface ApplicationContact {
  role?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface Application {
  _id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  platform?: string;
  platformDetail?: string;
  jobType?: string;
  workplaceType?: string;
  postedAt?: string | Date | null;
  postedAgeText?: string;
  postingObservedAt?: string | Date | null;
  postingPrecision?: "exact" | "approximate";
  statusHistory?: { status: string; at: string | Date; kind: string; byId?: string; byName?: string }[];
  applicationType?: string;
  submissionMethod?: string;
  submissionDetail?: string;
  applicationStatus: (typeof APPLICATION_STATUSES)[number];
  responseStatus?: string | null;
  responseNote?: string;
  responseAt?: Date | string | null;
  country?: string;
  city?: string;
  location?: string;
  contactNumber?: string;
  contacts?: ApplicationContact[];
  salary?: string;
  salaryType?: "fixed" | "range" | "negotiable" | "not-mentioned";
  salaryCurrency?: "EUR" | "USD" | "BDT";
  salaryFixed?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryExpectation?: SalaryExpectation | null;
  jobPostUrl?: string;
  additionalJobPostUrls?: string[];
  jobDescription?: string;
  appliedDate?: Date;
  notes?: string;
  submittedDocuments?: string[];
  providedDocuments?: { name: string; format?: string }[];
  followUpDate?: Date;
  priority?: "Low" | "Medium" | "High";
  attachments?: string[];
  favourite?: boolean;
  isGhostJob?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | string | null;
}
