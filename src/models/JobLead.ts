import mongoose, { Schema, type InferSchemaType } from "mongoose";

import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/jobs/constants";

const GapSchema = new Schema(
  {
    requirement: { type: String, maxlength: 300 },
    level: { type: String },
    verdict: { type: String },
    question: { type: String, maxlength: 300 },
    answer: { type: String, maxlength: 1000, default: "" },
  },
  { _id: false },
);

const JobLeadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    searchId: { type: Schema.Types.ObjectId, ref: "JobSearch", default: null },
    source: { type: String, enum: [...LEAD_SOURCES], required: true },
    platform: { type: String, default: "Other" },
    externalId: { type: String, required: true, maxlength: 300 },
    identity: { type: String, default: "", maxlength: 300 },
    matchKey: { type: String, default: "", maxlength: 400 },
    url: { type: String, maxlength: 2048, default: "" },
    applyUrl: { type: String, maxlength: 2048, default: "" },
    otherUrls: { type: [String], default: [] },
    company: { type: String, required: true, maxlength: 200 },
    title: { type: String, required: true, maxlength: 300 },
    location: { type: String, maxlength: 200, default: "" },
    city: { type: String, maxlength: 120, default: "" },
    country: { type: String, maxlength: 120, default: "" },
    postedAt: { type: Date, default: null },
    postedAgeText: { type: String, maxlength: 60, default: "" },
    deadline: { type: Date, default: null },
    description: { type: String, maxlength: 24000, default: "" },
    salary: { type: String, maxlength: 200, default: "" },
    remote: { type: Boolean, default: false },
    fitScore: { type: Number, min: 0, max: 100, default: null },
    fitGaps: { type: [GapSchema], default: [] },
    fitMode: { type: String, enum: ["keyword", "ai", ""], default: "" },
    status: { type: String, enum: [...LEAD_STATUSES], default: "new" },
    statusChangedAt: { type: Date, default: () => new Date() },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", default: null },
    cvFileIds: { type: [String], default: [] },
    prepared: {
      tailorMode: { type: String, default: "" },
      letterMode: { type: String, default: "" },
      changedFields: { type: [String], default: [] },
      note: { type: String, default: "" },
      letter: { type: Schema.Types.Mixed, default: null },
      format: { type: String, default: "" },
      output: { type: String, default: "" },
      at: { type: Date, default: null },
    },
    approvedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    error: { type: String, maxlength: 500, default: "" },
    ingestKey: { type: String, default: "", maxlength: 200 },
    firstSeenAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

JobLeadSchema.index({ userId: 1, source: 1, externalId: 1 }, { unique: true });
JobLeadSchema.index({ userId: 1, status: 1, firstSeenAt: -1 });
JobLeadSchema.index({ userId: 1, identity: 1 });
JobLeadSchema.index({ userId: 1, matchKey: 1 });
JobLeadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type JobLeadDocument = InferSchemaType<typeof JobLeadSchema>;

export default mongoose.models.JobLead ||
  mongoose.model<JobLeadDocument>("JobLead", JobLeadSchema);
