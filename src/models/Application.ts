import mongoose, { Schema, type InferSchemaType, type MongooseQueryMiddleware, type Query } from "mongoose";
import {
  APPLICATION_STATUSES, CONTACT_ROLES, DEFAULT_APPLICATION_STATUS, DOCUMENT_FORMATS, MAX_CONTACTS, MAX_JOB_POST_URLS,
  PROVIDED_DOCUMENTS, SUBMISSION_METHODS,
} from "@/constants/applicationStatus";

const HTTP_URL = /^https?:\/\/\S+$/i;

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
      validate: {
        validator: (v: unknown[] | undefined) => !v || v.length <= MAX_CONTACTS,
        message: `At most ${MAX_CONTACTS} contacts.`,
      },
    },
    salary: { type: String },
    salaryType: { type: String, enum: ["fixed", "range", "negotiable", "not-mentioned"], default: "fixed" },
    salaryCurrency: { type: String, enum: ["EUR", "USD", "BDT"], default: "USD" },
    salaryFixed: { type: Number },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    jobPostUrl: { type: String, trim: true, maxlength: 2048 },
    additionalJobPostUrls: {
      type: [String],
      default: undefined,
      validate: {
        validator: (v: string[] | undefined) =>
          !v || (v.length <= MAX_JOB_POST_URLS && v.every((u) => u.length <= 2048 && HTTP_URL.test(u))),
        message: `Up to ${MAX_JOB_POST_URLS} links, each starting with http:// or https://.`,
      },
    },
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
      validate: {
        validator: (v: { name: string }[] | undefined) =>
          !v || (v.length <= PROVIDED_DOCUMENTS.length && new Set(v.map((d) => d.name)).size === v.length),
        message: "Each document can be listed once.",
      },
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
          byId: { type: Schema.Types.ObjectId, ref: "User" },
          byName: { type: String },
        },
      ],
      default: [],
    },
    interviewSeen: { type: [String], default: [] },

    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedByName: { type: String },
  },
  { timestamps: true },
);

/* Soft delete. Every read and update skips rows in "Recently deleted" unless the
   filter names deletedAt itself (the trash queries do) or the query is run with
   { withDeleted: true }. Hard deletes are deliberately not hooked. */
const SOFT_DELETE_QUERIES: MongooseQueryMiddleware[] = [
  "find", "findOne", "findOneAndUpdate", "countDocuments", "updateOne", "updateMany", "distinct",
];

function includesDeleted(filter: Record<string, unknown>, options: Record<string, unknown>) {
  return options.withDeleted === true || Object.prototype.hasOwnProperty.call(filter, "deletedAt");
}

ApplicationSchema.pre(SOFT_DELETE_QUERIES, function (this: Query<unknown, unknown>) {
  if (includesDeleted(this.getFilter(), this.getOptions() as Record<string, unknown>)) return;
  this.where({ deletedAt: null });
});

ApplicationSchema.pre("aggregate", function () {
  const options = this.options as Record<string, unknown>;
  const first = this.pipeline()[0] as { $match?: Record<string, unknown> } | undefined;
  if (options.withDeleted === true || (first?.$match && "deletedAt" in first.$match)) return;
  this.pipeline().unshift({ $match: { deletedAt: null } });
});

export type ApplicationDocument = InferSchemaType<typeof ApplicationSchema>;

export default mongoose.models.Application ||
  mongoose.model<ApplicationDocument>("Application", ApplicationSchema);
