import mongoose, { Schema, type InferSchemaType } from "mongoose";

const RETENTION_DAYS = 400;

/* One row per administrative change: who did what to which record, with the
   fields that changed. Written best-effort beside every /api/admin mutation,
   never read on the hot path, and expired by TTL. */
const AdminActionSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorEmail: { type: String, default: "" },
    action: { type: String, required: true },
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "" },
    targetLabel: { type: String, default: "" },
    before: { type: Schema.Types.Mixed, default: undefined },
    after: { type: Schema.Types.Mixed, default: undefined },
    ip: { type: String, default: "" },
    expiresAt: { type: Date, default: () => new Date(Date.now() + RETENTION_DAYS * 86_400_000) },
  },
  { timestamps: true },
);

AdminActionSchema.index({ createdAt: -1 });
AdminActionSchema.index({ actorId: 1, createdAt: -1 });
AdminActionSchema.index({ action: 1, createdAt: -1 });
AdminActionSchema.index({ targetId: 1 });
AdminActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AdminActionDocument = InferSchemaType<typeof AdminActionSchema>;

export default mongoose.models.AdminAction ||
  mongoose.model<AdminActionDocument>("AdminAction", AdminActionSchema);
