import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: "", maxlength: 600 },
    href: { type: String, default: "" },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof NotificationSchema>;

export default mongoose.models.Notification ||
  mongoose.model<NotificationDocument>("Notification", NotificationSchema);
