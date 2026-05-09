export interface Interview {
  _id: string;
  applicationId: string;
  stageName: string;
  status?: "Scheduled" | "Completed" | "Cancelled";
  scheduledDate?: Date;
  feedback?: string;
  notes?: string;
  createdAt: Date;
}
