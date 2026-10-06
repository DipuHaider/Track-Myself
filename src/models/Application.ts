import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  APPLICATION_STATUSES, CONTACT_ROLES, DEFAULT_APPLICATION_STATUS, DOCUMENT_FORMATS, PROVIDED_DOCUMENTS, SUBMISSION_METHODS,
} from "@/constants/applicationStatus";

const ApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    platform: { type: String },
    jobType: { type: String },
    workplaceType: { type: String },
    applicationType: { type: String },
    submissionMethod: { type: String, enum: [...SUBMISSION_METHODS] },
    submissionDetail: { type: String, trim: true, maxlength: 300 },
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
    contacts: {
      type: [
        {
          _id: false,
          role: { type: String, enum: [...CONTACT_ROLES, ""] },
          name: { type: String, trim: true, maxlength: 120 },
          email: { type: String, trim: true, lowercase: true, maxlength: 200 },
          phone: { type: String, trim: true, maxlength: 40 },
        },
      ],
      default: undefined,
    },
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
    providedDocuments: {
      type: [
        {
          _id: false,
          name: { type: String, enum: [...PROVIDED_DOCUMENTS], required: true },
          format: { type: String, enum: [...DOCUMENT_FORMATS], default: ".pdf" },
        },
      ],
      default: undefined,
    },
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
