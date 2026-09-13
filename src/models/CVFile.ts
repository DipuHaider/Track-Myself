import mongoose, { Schema } from "mongoose";
import { CV_FILE_CATEGORIES } from "@/types/cv";

const CVFileSchema = new Schema(
  {
    userId:   { type: String, required: true, index: true },
    category: { type: String, enum: [...CV_FILE_CATEGORIES], default: "other", index: true },
    name:     { type: String, required: true },
    size:     { type: Number, required: true },
    mimeType: { type: String, required: true },
    data:     { type: String, required: true },

    /* Cached plain text from the last import, so repeat generations do not
       re-parse a PDF every time. Cleared implicitly by re-uploading. */
    parsedText: { type: String, default: "" },
    parsedAt:   { type: Date, default: null },

    /* Documents this app produced, as opposed to files the user uploaded.
       These are excluded from the import cascade — reading our own output back
       in would be circular. */
    generated:  { type: Boolean, default: false, index: true },
    genFormat:  { type: String, default: "" },
    genVariant: { type: String, default: "" },
    genDocType: { type: String, default: "" },
    genOutput:  { type: String, default: "" },
    genFor:     { type: String, default: "" },

    /* The content this document was built from, so it can be re-rendered or edited
       later without guessing. Photo is stripped — a data URI would dwarf the row. */
    genContent:   { type: String,  default: "" },
    genContentAt: { type: Date,    default: null },
    genDate:      { type: String,  default: "" },
    genNote:      { type: String,  default: "" },
    genTailor:    { type: String,  default: "" },
    genEdited:    { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } },
);

export default mongoose.models.CVFile || mongoose.model("CVFile", CVFileSchema);
