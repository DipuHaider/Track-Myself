import mongoose, { Schema, type InferSchemaType } from "mongoose";

/* One document per period, and the period is the _id — "global:2026-09". Making
   the period part of the identity rather than a mutable field removes the
   month-rollover race by construction: two requests either side of midnight
   address different documents, so neither can clobber the other's counters.

   Money is counted in whole nano-dollars. $inc on a fractional value accumulates
   float error, which would make the ceiling guard unsound over a month. */
const AiBudgetSchema = new Schema(
  {
    _id: { type: String, required: true },
    periodKey: { type: String, required: true },
    ceilingNano: { type: Number, required: true },
    reservedNano: { type: Number, default: 0 },
    settledNano: { type: Number, default: 0 },
    holdCount: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false },
);

export type AiBudgetDocument = InferSchemaType<typeof AiBudgetSchema>;

export default mongoose.models.AiBudget ||
  mongoose.model<AiBudgetDocument>("AiBudget", AiBudgetSchema);
