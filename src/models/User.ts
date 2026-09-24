import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    googleId: { type: String, default: null },
    role: {
      type: String,
      enum: ["superadmin", "admin", "editor", "paid", "free"],
      default: "free",
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
      index: true,
    },
    pausedAt: { type: Date, default: null },
    sessionsValidFrom: { type: Date, default: null },
    bio: { type: String, default: "" },
    image: { type: String, default: "" },
    toursSeen: { type: [String], default: [] },
    notifSeen: { type: [String], default: [] },
    aiKey: {
      provider: { type: String, enum: ["anthropic", "gemini", "openai-compatible"], default: null },
      model: { type: String, default: "" },
      baseUrl: { type: String, default: "" },
      ciphertext: { type: String, default: "" },
      iv: { type: String, default: "" },
      tag: { type: String, default: "" },
      last4: { type: String, default: "" },
      addedAt: { type: Date, default: null },
      status: { type: String, enum: ["ok", "invalid", "rate-limited", "quota", "error"], default: "ok" },
      lastError: { type: String, default: "" },
      lastCheckedAt: { type: Date, default: null },
    },
    /* Shared-key usage is counted apart from aiUsage, which the AI-key page
       presents as "your key's usage". Merging them would misreport a user's own
       consumption and let a shared-key failure mark their key invalid. */
    aiSharedUsage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      calls: { type: Number, default: 0 },
      lastCallAt: { type: Date, default: null },
      monthKey: { type: String, default: "" },
      monthInputTokens: { type: Number, default: 0 },
      monthOutputTokens: { type: Number, default: 0 },
      monthCalls: { type: Number, default: 0 },
    },
    aiUsage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      calls: { type: Number, default: 0 },
      lastCallAt: { type: Date, default: null },
      monthKey: { type: String, default: "" },
      monthInputTokens: { type: Number, default: 0 },
      monthOutputTokens: { type: Number, default: 0 },
      monthCalls: { type: Number, default: 0 },
    },
    a11y: {
      textScale: { type: String, enum: ["sm", "md", "lg", "xl"], default: "md" },
      scheme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      contrast: { type: Boolean, default: false },
      reduceMotion: { type: Boolean, default: false },
      dyslexiaFont: { type: Boolean, default: false },
      readingSpacing: { type: Boolean, default: false },
      underlineLinks: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export default mongoose.models.User ||
  mongoose.model<UserDocument>("User", UserSchema);
