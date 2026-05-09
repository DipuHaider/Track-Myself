import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ReminderSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    title: { type: String, required: true },
    remindAt: { type: Date, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ReminderDocument = InferSchemaType<typeof ReminderSchema>;

export default mongoose.models.Reminder ||
  mongoose.model<ReminderDocument>("Reminder", ReminderSchema);
