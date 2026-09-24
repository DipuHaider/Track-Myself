import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AppSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    tourEnabled: { type: Boolean, default: true },
    tourHome: { type: Boolean, default: true },
    tourPortal: { type: Boolean, default: true },
    tourDashboard: { type: Boolean, default: true },
    updatedBy: { type: String, default: "" },

    /* AI runtime policy. Kept beside the tour flags because both are operator
       switches on one singleton, but written by saveAiConfig() rather than
       saveAppSettings(), whose narrow whitelist is deliberate. */
    ai: {
      enabled: { type: Boolean, default: true },
      sharedModels: {
        type: [
          {
            _id: false,
            modelId: { type: String, required: true },
            enabled: { type: Boolean, default: false },
            order: { type: Number, default: 0 },
          },
        ],
        default: undefined,
      },
      ceilingUsd: { type: Number, default: 9 },
      freeMonthlyAttempts: { type: Number, default: 10 },
      premiumMonthlyAttempts: { type: Number, default: 200 },
      anonDailyAttempts: { type: Number, default: 0 },
      taskModels: { type: Schema.Types.Mixed, default: undefined },
    },
  },
  { timestamps: true },
);

export type AppSettingsDocument = InferSchemaType<typeof AppSettingsSchema>;

export default mongoose.models.AppSettings ||
  mongoose.model<AppSettingsDocument>("AppSettings", AppSettingsSchema);
