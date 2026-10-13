import Application from "@/models/Application";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import Document from "@/models/Document";
import Interview from "@/models/Interview";
import IssueReport from "@/models/IssueReport";
import Notification from "@/models/Notification";
import PasswordResetToken from "@/models/PasswordResetToken";
import EmailVerificationToken from "@/models/EmailVerificationToken";
import AiDraft from "@/models/AiDraft";
import AiCallLog from "@/models/AiCallLog";
import AiUsageCounter from "@/models/AiUsageCounter";
import RateBucket from "@/models/RateBucket";
import Todo from "@/models/Todo";
import JobSearch from "@/models/JobSearch";
import JobLead from "@/models/JobLead";
import ApiToken from "@/models/ApiToken";
import User from "@/models/User";
import { invalidateClaims } from "@/lib/auth";

export type PurgeSummary = {
  applications: number;
  interviews: number;
  cvFiles: number;
  cvProfiles: number;
  documents: number;
  todos: number;
  notifications: number;
  issueReports: number;
  resetTokens: number;
  verificationTokens: number;
  aiDrafts: number;
  aiCalls: number;
  aiCounters: number;
  rateBuckets: number;
  jobLeads: number;
  jobSearches: number;
  apiTokens: number;
  userDeleted: boolean;
  errors: string[];
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Every userId-scoped collection, in dependency order, each step isolated so
   one failure does not skip the rest. The User row goes last and only when
   nothing failed: a half-deleted account keeps its row, paused and marked
   `deletingAt`, so the maintenance job can finish the purge and nothing is
   ever orphaned by a lost write. */
export async function purgeUserData(userId: string, email?: string | null): Promise<PurgeSummary> {
  const summary: PurgeSummary = {
    applications: 0, interviews: 0, cvFiles: 0, cvProfiles: 0, documents: 0, todos: 0,
    notifications: 0, issueReports: 0, resetTokens: 0, verificationTokens: 0, aiDrafts: 0,
    aiCalls: 0, aiCounters: 0, rateBuckets: 0, jobLeads: 0, jobSearches: 0, apiTokens: 0,
    userDeleted: false, errors: [],
  };

  await User.updateOne(
    { _id: userId },
    { $set: { status: "paused", deletingAt: new Date(), sessionsValidFrom: new Date() } },
  ).catch(() => {});
  invalidateClaims(email);

  const applications = await Application.find({ userId }, "_id").setOptions({ withDeleted: true }).lean();
  const applicationIds = applications.map((a) => a._id);

  const steps: [keyof Omit<PurgeSummary, "userDeleted" | "errors">, () => Promise<{ deletedCount?: number }>][] = [
    ["interviews", () => Interview.deleteMany({ $or: [{ userId }, { applicationId: { $in: applicationIds } }] })],
    ["documents", () => Document.deleteMany({ userId })],
    ["applications", () => Application.deleteMany({ userId })],
    ["cvFiles", () => CVFile.deleteMany({ userId })],
    ["cvProfiles", () => CVProfile.deleteMany({ userId })],
    ["todos", () => Todo.deleteMany({ userId })],
    ["notifications", () => Notification.deleteMany({ userId })],
    ["issueReports", () => IssueReport.deleteMany({ userId })],
    ["resetTokens", () => PasswordResetToken.deleteMany({ userId })],
    ["verificationTokens", () => EmailVerificationToken.deleteMany({ userId })],
    ["aiDrafts", () => AiDraft.deleteMany({ userId })],
    ["aiCalls", () => AiCallLog.deleteMany({ userId })],
    ["aiCounters", () => AiUsageCounter.deleteMany({ subject: `user:${userId}` })],
    ["rateBuckets", () => RateBucket.deleteMany({ key: { $regex: escapeRegex(userId) } })],
    ["jobLeads", () => JobLead.deleteMany({ userId })],
    ["jobSearches", () => JobSearch.deleteMany({ userId })],
    ["apiTokens", () => ApiToken.deleteMany({ userId })],
  ];

  for (const [name, run] of steps) {
    try {
      const res = await run();
      summary[name] = res.deletedCount ?? 0;
    } catch (err) {
      summary.errors.push(`${name}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  if (summary.errors.length === 0) {
    try {
      await User.deleteOne({ _id: userId });
      summary.userDeleted = true;
    } catch (err) {
      summary.errors.push(`user: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  invalidateClaims(email);
  return summary;
}

export async function retryPendingDeletions(olderThanMs = 10 * 60 * 1000): Promise<{ retried: number; completed: number }> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = (await User.find({ deletingAt: { $ne: null, $lt: cutoff } }, "_id email").limit(20).lean()) as
    { _id: unknown; email?: string }[];
  let completed = 0;
  for (const row of rows) {
    const res = await purgeUserData(String(row._id), row.email);
    if (res.userDeleted) completed++;
  }
  return { retried: rows.length, completed };
}
