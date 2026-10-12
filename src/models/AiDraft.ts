import mongoose, { Schema, type InferSchemaType } from "mongoose";

/* A generated draft the user has already paid for, keyed by everything that
   would change the answer. Reopening a review or downloading what was
   previewed reads this instead of starting a fresh billed call. */
const AiDraftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: {
      type: String,
      enum: ["cv-preview", "cover-letter", "interview-questions"],
      required: true,
    },
    hash: { type: String, required: true },
    label: { type: String, default: "" },
    payload: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

AiDraftSchema.index({ userId: 1, kind: 1, hash: 1 }, { unique: true });
AiDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AiDraftDocument = InferSchemaType<typeof AiDraftSchema>;

export default mongoose.models.AiDraft || mongoose.model<AiDraftDocument>("AiDraft", AiDraftSchema);
