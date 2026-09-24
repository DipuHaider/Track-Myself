import mongoose, { Schema } from "mongoose";
import { CV_FILE_CATEGORIES } from "@/types/cv";

const CVFileSchema = new Schema(
  {
    userId:   { type: String, required: true, index: true },
    category: { type: String, enum: [...CV_FILE_CATEGORIES], default: "other", index: true },
    name:     { type: String, required: true },

    /* Optional so a tailored draft can be stored before anything is rendered.
       An uploaded file always has bytes; a preview is content awaiting a
       decision, and forcing it to invent a buffer would mean rendering a
       document the user may never ask for. */
    size:     { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    data:     { type: String, default: "" },

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

    /* Identifies the inputs that produced a draft — job description, correction
       and the baseline it started from. The rest of the gen* signature says what
       kind of document this is, not what it was made from, so without this a
       changed job description would silently collide onto the same row and hand
       back yesterday's tailoring. */
    genInputHash: { type: String,  default: "", index: true },
    genContentAt: { type: Date,    default: null },
    genDate:      { type: String,  default: "" },
    genNote:      { type: String,  default: "" },
    genTailor:    { type: String,  default: "" },
    genEdited:    { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } },
);

export default mongoose.models.CVFile || mongoose.model("CVFile", CVFileSchema);
