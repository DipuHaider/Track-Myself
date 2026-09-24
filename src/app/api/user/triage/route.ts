export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireActiveAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import { getUserCredential } from "@/lib/ai/userKey";
import { ruleSuggestions, shortlist, triageWithAi, type InterviewLite } from "@/lib/ai/triage";
import type { Actor } from "@/lib/ai/gateway";
import type { Application as App } from "@/types/application";

async function load(userId: string) {
  await dbConnect();

  const apps = (await Application.find(
    { userId },
    "companyName jobTitle applicationStatus appliedDate followUpDate createdAt postedAt postingPrecision",
  )
    .sort({ updatedAt: -1 })
    .limit(300)
    .lean()) as unknown as App[];

  /* Interviews are read through applications the caller owns, never queried by
     applicationId alone — an id from elsewhere must not reach another user's
     schedule. */
  const ids = apps.map((a) => a._id);
  const interviews = (await Interview.find(
    { applicationId: { $in: ids } },
    "applicationId scheduledDate status",
  ).lean()) as unknown as InterviewLite[];

  return { apps, interviews };
}

export async function GET() {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const { apps, interviews } = await load(auth.id);
  return NextResponse.json(ruleSuggestions(shortlist(apps, interviews)));
}

export async function POST() {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const { apps, interviews } = await load(auth.id);
  const rows = shortlist(apps, interviews);

  const actor: Actor = { kind: "user", id: auth.id, role: auth.role, plan: auth.plan };

  return NextResponse.json(
    await triageWithAi({ rows, actor, userKey: await getUserCredential(auth.id) }),
  );
}
