import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, default: "attachment" },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },

    /* Bytes live in the document, the same way CVFile stores them. The serverless
       filesystem this used to write to is read-only and does not survive a
       deploy, so anything written there was lost. */
    data: { type: String, default: "" },

    /* Legacy rows written before the move — a public /uploads/... path. */
    url: { type: String, default: "" },
  },
  { timestamps: true },
);

export type DocumentRecord = InferSchemaType<typeof DocumentSchema>;

export default mongoose.models.Document ||
  mongoose.model<DocumentRecord>("Document", DocumentSchema);
