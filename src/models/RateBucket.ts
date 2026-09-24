import mongoose, { Schema, type InferSchemaType } from "mongoose";

/* Fixed window, not sliding: _id is "<key>|<windowStart>" so the window is part
   of the identity and expires on its own. A sliding window would need a per-key
   array of timestamps, which grows without bound and rewrites on every hit.

   This replaces the in-process Map for routes where the limit has to hold across
   serverless instances rather than per warm lambda. */
const RateBucketSchema = new Schema(
  {
    _id: { type: String, required: true },
    key: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false, _id: false },
);

RateBucketSchema.index({ key: 1 });
RateBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateBucketDocument = InferSchemaType<typeof RateBucketSchema>;

export default mongoose.models.RateBucket ||
  mongoose.model<RateBucketDocument>("RateBucket", RateBucketSchema);
