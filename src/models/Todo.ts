import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TodoSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    done: { type: Boolean, default: false },
    dueAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

TodoSchema.index({ userId: 1, done: 1, order: 1 });

export type TodoDocument = InferSchemaType<typeof TodoSchema>;

export default mongoose.models.Todo ||
  mongoose.model<TodoDocument>("Todo", TodoSchema);
