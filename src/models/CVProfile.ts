import mongoose, { Schema } from "mongoose";

const LegacyFileEntrySchema = new Schema(
  {
    name:     { type: String, required: true },
    size:     { type: Number, required: true },
    mimeType: { type: String, required: true },
    data:     { type: String, required: true },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } },
);

const PrimarySchema = new Schema(
  {
    cv:           { type: String, default: "" },
    resume:       { type: String, default: "" },
    coverLetter:  { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    coverImage:   { type: String, default: "" },
  },
  { _id: false },
);

const CVProfileSchema = new Schema(
  {
    userId:        { type: String, required: true, unique: true },
    name:          { type: String, default: "" },
    title:         { type: String, default: "" },
    email:         { type: String, default: "" },
    phone:         { type: String, default: "" },
    location:      { type: String, default: "" },
    linkedin:      { type: String, default: "" },
    website:       { type: String, default: "" },
    summary:       { type: String, default: "" },
    experience:    { type: String, default: "" },
    education:     { type: String, default: "" },
    skills:        { type: String, default: "" },
    languages:     { type: String, default: "" },
    photo:         { type: String, default: "" },
    content:       { type: Schema.Types.Mixed, default: {} },
    contentReady:  { type: Boolean, default: false },
    templateTab:   { type: String, enum: ["ats", "europass", "designer"], default: "ats" },
    templateIdx:   { type: Number, default: 0, min: 0, max: 2 },
    primary:       { type: PrimarySchema, default: () => ({}) },
    uploadedFiles: [LegacyFileEntrySchema],
    mainFileId:    { type: String, default: "" },
  },
  { timestamps: true, minimize: false },
);

export default mongoose.models.CVProfile || mongoose.model("CVProfile", CVProfileSchema);
