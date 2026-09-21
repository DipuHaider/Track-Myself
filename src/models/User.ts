import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    googleId: { type: String, default: null },
    role: {
      type: String,
      enum: ["superadmin", "admin", "editor", "paid", "free"],
      default: "free",
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
      index: true,
    },
    pausedAt: { type: Date, default: null },
    sessionsValidFrom: { type: Date, default: null },
    bio: { type: String, default: "" },
    image: { type: String, default: "" },
    toursSeen: { type: [String], default: [] },
    notifSeen: { type: [String], default: [] },
    a11y: {
      textScale: { type: String, enum: ["sm", "md", "lg", "xl"], default: "md" },
      scheme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      contrast: { type: Boolean, default: false },
      reduceMotion: { type: Boolean, default: false },
      dyslexiaFont: { type: Boolean, default: false },
      readingSpacing: { type: Boolean, default: false },
      underlineLinks: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export default mongoose.models.User ||
  mongoose.model<UserDocument>("User", UserSchema);
