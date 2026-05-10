import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    platform: { type: String },
    applicationType: { type: String },
    submissionMethod: { type: String },
    applicationStatus: {
      type: String,
      enum: [
        "Wishlist",
        "Submitted",
        "No Response",
        "Interview Scheduled",
        "Active - Written",
        "Active - HR",
        "Active - Technical",
        "Active - Cultural Fit",
        "Offer Received",
        "Rejected",
      ],
      default: "Wishlist",
    },
    responseStatus: { type: String },
    platformDetail: { type: String },
    country: { type: String },
    city: { type: String },
    location: { type: String },
    contactNumber: { type: String },
    salary: { type: String },
    salaryType: { type: String, enum: ["fixed", "range"], default: "fixed" },
    salaryCurrency: { type: String, enum: ["EUR", "USD", "BDT"], default: "USD" },
    salaryFixed: { type: Number },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    jobPostUrl: { type: String },
    appliedDate: { type: Date },
    notes: { type: String },
    submittedDocuments: [{ type: String }],
    followUpDate: { type: Date },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    attachments: [{ type: String }],
  },
  { timestamps: true },
);

export type ApplicationDocument = InferSchemaType<typeof ApplicationSchema>;

export default mongoose.models.Application ||
  mongoose.model<ApplicationDocument>("Application", ApplicationSchema);
