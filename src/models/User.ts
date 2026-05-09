import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "editor", "premium", "general"],
      default: "general",
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    bio: { type: String, default: "" },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export default mongoose.models.User ||
  mongoose.model<UserDocument>("User", UserSchema);
