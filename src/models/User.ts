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
    bio: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export default mongoose.models.User ||
  mongoose.model<UserDocument>("User", UserSchema);
