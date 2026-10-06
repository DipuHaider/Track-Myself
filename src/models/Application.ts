import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { APPLICATION_STATUSES, DEFAULT_APPLICATION_STATUS } from "@/constants/applicationStatus";

const ApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    platform: { type: String },
    jobType: { type: String },
    workplaceType: { type: String },
    applicationType: { type: String },
    submissionMethod: { type: String },
    applicationStatus: {
      type: String,
      enum: [...APPLICATION_STATUSES],
      default: DEFAULT_APPLICATION_STATUS,
    },
    responseStatus: { type: String },
    platformDetail: { type: String },
    country: { type: String },
    city: { type: String },
    location: { type: String },
    contactNumber: { type: String },
    salary: { type: String },
    salaryType: { type: String, enum: ["fixed", "range", "negotiable", "not-mentioned"], default: "fixed" },
    salaryCurrency: { type: String, enum: ["EUR", "USD", "BDT"], default: "USD" },
    salaryFixed: { type: Number },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    jobPostUrl: { type: String },
    additionalJobPostUrls: { type: [String], default: undefined },
    jobDescription: { type: String, maxlength: 24000 },
    appliedDate: { type: Date },
    notes: { type: String },
    submittedDocuments: [{ type: String }],
    followUpDate: { type: Date },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    attachments: [{ type: String }],
    favourite: { type: Boolean, default: false },
    isGhostJob: { type: Boolean, default: false },

    postedAt: { type: Date, default: null },
    postedAgeText: { type: String, default: "" },
    postingObservedAt: { type: Date, default: null },
    postingPrecision: { type: String, enum: ["exact", "approximate"] },

    statusHistory: {
      type: [
        {
          _id: false,
          status: { type: String, required: true },
          at: { type: Date, required: true },
          kind: {
            type: String,
            enum: ["created", "transition", "observed_baseline"],
            default: "transition",
          },
        },
      ],
      default: [],
    },
    interviewSeen: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type ApplicationDocument = InferSchemaType<typeof ApplicationSchema>;

export default mongoose.models.Application ||
  mongoose.model<ApplicationDocument>("Application", ApplicationSchema);
