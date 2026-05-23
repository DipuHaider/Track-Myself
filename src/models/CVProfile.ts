import mongoose, { Schema } from "mongoose";

const FileEntrySchema = new Schema(
  {
    name:     { type: String, required: true },
    size:     { type: Number, required: true },
    mimeType: { type: String, required: true },
    data:     { type: String, required: true },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } },
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
    uploadedFiles: [FileEntrySchema],
    mainFileId:    { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.CVProfile || mongoose.model("CVProfile", CVProfileSchema);
