import mongoose, { Schema, type InferSchemaType } from "mongoose";

const EmailVerificationTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    requestedIp: { type: String, default: "" },
  },
  { timestamps: true },
);

EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type EmailVerificationTokenDocument = InferSchemaType<typeof EmailVerificationTokenSchema>;

export default mongoose.models.EmailVerificationToken ||
  mongoose.model<EmailVerificationTokenDocument>("EmailVerificationToken", EmailVerificationTokenSchema);
