import { NextResponse } from "next/server";
import { requireActiveAuth, type SessionUser } from "@/lib/serverAuth";
import { canUseJobHunt } from "@/lib/permissions";
import { getAppSettings } from "@/lib/appSettings";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { normaliseJobHunt, type JobHuntSettings } from "@/lib/jobs/settings";

export async function jobHuntAllowed(user: Pick<SessionUser, "role" | "plan">): Promise<boolean> {
  const settings = await getAppSettings();
  return canUseJobHunt(user.role, user.plan, settings.features.jobHunt);
}

export const jobHuntUnavailable = () =>
  NextResponse.json(
    { error: "Job hunt is not available on your plan yet.", code: "job-hunt-unavailable" },
    { status: 403 },
  );

export async function requireJobHuntAuth(): Promise<SessionUser | NextResponse> {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  if (!(await jobHuntAllowed(auth))) return jobHuntUnavailable();
  return auth;
}

export async function loadJobHunt(userId: string): Promise<JobHuntSettings> {
  await dbConnect();
  const row = (await User.findById(userId, "jobHunt").lean()) as { jobHunt?: unknown } | null;
  return normaliseJobHunt(row?.jobHunt);
}

export async function saveJobHunt(userId: string, settings: JobHuntSettings): Promise<void> {
  await dbConnect();
  await User.updateOne({ _id: userId }, { $set: { jobHunt: settings } });
}
