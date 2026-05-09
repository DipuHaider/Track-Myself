import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true },
);

export type DocumentRecord = InferSchemaType<typeof DocumentSchema>;

export default mongoose.models.Document ||
  mongoose.model<DocumentRecord>("Document", DocumentSchema);
