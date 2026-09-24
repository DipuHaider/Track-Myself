import mongoose, { Schema, type InferSchemaType } from "mongoose";

/* Append-only, one row per provider attempt, and the thing that makes releasing
   a reservation idempotent: every counter change is gated on a state transition
   succeeding here first, so a sweeper and a late response cannot both settle the
   same call. It is also the only record that can be reconciled against a
   provider invoice. */
const AiCallLogSchema = new Schema(
  {
    callId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    subject: { type: String, required: true },
    task: { type: String, required: true },
    modelId: { type: String, default: "" },
    funding: { type: String, enum: ["user", "shared", "superadmin"], required: true },
    periodKey: { type: String, required: true },
    estNano: { type: Number, default: 0 },
    actualNano: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    state: {
      type: String,
      enum: ["reserved", "dispatched", "settled", "released", "orphaned"],
      default: "reserved",
    },
    dispatchedAt: { type: Date, default: null },
    settledAt: { type: Date, default: null },
    outcome: {
      ok: { type: Boolean, default: false },
      kind: { type: String, default: "" },
      error: { type: String, default: "" },
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

AiCallLogSchema.index({ state: 1, dispatchedAt: 1 });
AiCallLogSchema.index({ userId: 1, createdAt: -1 });
AiCallLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AiCallLogDocument = InferSchemaType<typeof AiCallLogSchema>;

export default mongoose.models.AiCallLog ||
  mongoose.model<AiCallLogDocument>("AiCallLog", AiCallLogSchema);
