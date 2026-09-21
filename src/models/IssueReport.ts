import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ISSUE_CATEGORIES, ISSUE_MESSAGE_MAX, ISSUE_STATUSES } from "@/constants/issues";

const IssueReportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, default: "" },
    role: { type: String, default: "" },
    category: { type: String, enum: ISSUE_CATEGORIES, default: "Bug" },
    message: { type: String, required: true, trim: true, maxlength: ISSUE_MESSAGE_MAX },
    url: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    viewport: { type: String, default: "" },
    status: { type: String, enum: ISSUE_STATUSES, default: "open", index: true },
    note: { type: String, default: "" },
    notifiedAt: { type: Date, default: null },
    notifyError: { type: String, default: "" },
  },
  { timestamps: true },
);

IssueReportSchema.index({ status: 1, createdAt: -1 });

export type IssueReportDocument = InferSchemaType<typeof IssueReportSchema>;

export default mongoose.models.IssueReport ||
  mongoose.model<IssueReportDocument>("IssueReport", IssueReportSchema);
