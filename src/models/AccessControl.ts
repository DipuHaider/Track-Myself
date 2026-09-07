import mongoose, { Schema } from "mongoose";

const AccessControlSchema = new Schema(
  {
    key:       { type: String, required: true, unique: true, default: "default" },
    matrix:    { type: Map, of: [String], default: {} },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.AccessControl ||
  mongoose.model("AccessControl", AccessControlSchema);
