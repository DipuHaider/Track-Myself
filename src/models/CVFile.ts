import mongoose, { Schema } from "mongoose";
import { CV_FILE_CATEGORIES } from "@/types/cv";

const CVFileSchema = new Schema(
  {
    userId:   { type: String, required: true, index: true },
    category: { type: String, enum: [...CV_FILE_CATEGORIES], default: "other", index: true },
    name:     { type: String, required: true },
    size:     { type: Number, required: true },
    mimeType: { type: String, required: true },
    data:     { type: String, required: true },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } },
);

export default mongoose.models.CVFile || mongoose.model("CVFile", CVFileSchema);
