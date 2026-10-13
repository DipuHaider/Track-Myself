import mongoose, { Schema, type InferSchemaType } from "mongoose";

import { JOB_SOURCES } from "@/lib/jobs/constants";

const JobSearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    keywords: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    radiusKm: { type: Number, min: 0, max: 200, default: 25 },
    remote: { type: Boolean, default: false },
    sources: { type: [String], enum: [...JOB_SOURCES], default: ["ba", "adzuna"] },
    maxAgeDays: { type: Number, min: 1, max: 14, default: 3 },
    excludeCompanies: { type: [String], default: [] },
    extensionUrls: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
    lastRunSummary: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

JobSearchSchema.index({ userId: 1, active: 1 });

export type JobSearchDocument = InferSchemaType<typeof JobSearchSchema>;

export default mongoose.models.JobSearch ||
  mongoose.model<JobSearchDocument>("JobSearch", JobSearchSchema);
