import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const API_SCOPES = [
  "leads:read", "leads:write", "hunt:run", "prepare", "applications:read", "applications:write", "report:read",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

const ApiTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    scopes: { type: [String], enum: [...API_SCOPES], default: [] },
    hash: { type: String, required: true, unique: true },
    last4: { type: String, default: "" },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type ApiTokenDocument = InferSchemaType<typeof ApiTokenSchema>;

export default mongoose.models.ApiToken ||
  mongoose.model<ApiTokenDocument>("ApiToken", ApiTokenSchema);
