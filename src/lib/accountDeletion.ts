import Application from "@/models/Application";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import Document from "@/models/Document";
import Interview from "@/models/Interview";
import Reminder from "@/models/Reminder";
import User from "@/models/User";
import { invalidateClaims } from "@/lib/auth";

export type PurgeSummary = {
  applications: number;
  interviews: number;
  reminders: number;
  cvFiles: number;
  cvProfiles: number;
  documents: number;
};

export async function purgeUserData(userId: string, email?: string | null): Promise<PurgeSummary> {
  const applications = await Application.find({ userId }, "_id").lean();
  const applicationIds = applications.map((a) => a._id);

  const [interviews, reminders, apps, files, profiles, documents] = await Promise.all([
    Interview.deleteMany({ applicationId: { $in: applicationIds } }),
    Reminder.deleteMany({ applicationId: { $in: applicationIds } }),
    Application.deleteMany({ userId }),
    CVFile.deleteMany({ userId }),
    CVProfile.deleteMany({ userId }),
    Document.deleteMany({ userId }),
  ]);

  await User.findByIdAndDelete(userId);
  invalidateClaims(email);

  return {
    applications: apps.deletedCount ?? 0,
    interviews: interviews.deletedCount ?? 0,
    reminders: reminders.deletedCount ?? 0,
    cvFiles: files.deletedCount ?? 0,
    cvProfiles: profiles.deletedCount ?? 0,
    documents: documents.deletedCount ?? 0,
  };
}
