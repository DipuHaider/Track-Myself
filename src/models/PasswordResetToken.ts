import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PasswordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    requestedIp: { type: String, default: "" },
  },
  { timestamps: true },
);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenDocument = InferSchemaType<typeof PasswordResetTokenSchema>;

export default mongoose.models.PasswordResetToken ||
  mongoose.model<PasswordResetTokenDocument>("PasswordResetToken", PasswordResetTokenSchema);
