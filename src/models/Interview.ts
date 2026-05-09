import mongoose, { Schema, type InferSchemaType } from "mongoose";

const InterviewSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    stageName: { type: String, required: true },
    status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"] },
    scheduledDate: { type: Date },
    feedback: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

export type InterviewDocument = InferSchemaType<typeof InterviewSchema>;

export default mongoose.models.Interview ||
  mongoose.model<InterviewDocument>("Interview", InterviewSchema);
