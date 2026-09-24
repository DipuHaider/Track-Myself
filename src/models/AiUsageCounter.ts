import mongoose, { Schema, type InferSchemaType } from "mongoose";

/* Attempts per subject per period. subject is "user:<id>" or "ip:<addr>" so an
   anonymous caller can be capped without inventing a User row for them.

   _id is "<subject>|<periodKey>" rather than a generated id with a compound
   unique index. Uniqueness then comes from the primary key, which exists from
   the collection's first write. A unique index is built asynchronously, and
   until it finishes an upsert whose guard fails will happily insert a second
   document for the same subject — which silently doubles the cap. That is not a
   theoretical risk; it is what happened the first time this was tested.

   limit is stored for display and audit only — the reservation compares against
   the live configured value, so raising a tier takes effect on the next call
   with no migration. */
const AiUsageCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    subject: { type: String, required: true },
    periodKey: { type: String, required: true },
    limit: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    settled: { type: Number, default: 0 },
    released: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, _id: false },
);

AiUsageCounterSchema.index({ subject: 1, periodKey: 1 });
AiUsageCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AiUsageCounterDocument = InferSchemaType<typeof AiUsageCounterSchema>;

export default mongoose.models.AiUsageCounter ||
  mongoose.model<AiUsageCounterDocument>("AiUsageCounter", AiUsageCounterSchema);
