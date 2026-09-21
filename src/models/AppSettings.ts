import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AppSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    tourEnabled: { type: Boolean, default: true },
    tourHome: { type: Boolean, default: true },
    tourPortal: { type: Boolean, default: true },
    tourDashboard: { type: Boolean, default: true },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export type AppSettingsDocument = InferSchemaType<typeof AppSettingsSchema>;

export default mongoose.models.AppSettings ||
  mongoose.model<AppSettingsDocument>("AppSettings", AppSettingsSchema);
