import mongoose, { Schema, type InferSchemaType } from "mongoose";

/* Attempts per subject per period. subject is "user:<id>" or "ip:<addr>" so an
   anonymous caller can be capped without inventing a User row for them.

   limit is stored for display and audit only — the reservation compares against
   the live configured value, so raising a tier takes effect on the next call
   with no migration. */
const AiUsageCounterSchema = new Schema(
  {
    subject: { type: String, required: true },
    periodKey: { type: String, required: true },
    limit: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    settled: { type: Number, default: 0 },
    released: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

AiUsageCounterSchema.index({ subject: 1, periodKey: 1 }, { unique: true });
AiUsageCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AiUsageCounterDocument = InferSchemaType<typeof AiUsageCounterSchema>;

export default mongoose.models.AiUsageCounter ||
  mongoose.model<AiUsageCounterDocument>("AiUsageCounter", AiUsageCounterSchema);
