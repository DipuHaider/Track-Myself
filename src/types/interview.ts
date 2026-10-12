import type { InterviewStatus } from "@/schemas/interviewSchema";

export interface Interview {
  _id: string;
  applicationId: string;
  userId?: string;
  stageName: string;
  status?: InterviewStatus;
  scheduledDate: string | null;
  feedback?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type InterviewInput = {
  stageName: string;
  status: InterviewStatus;
  scheduledDate: string | null;
  feedback: string;
  notes: string;
};
