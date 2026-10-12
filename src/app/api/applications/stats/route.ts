export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { requireActiveAuth } from "@/lib/serverAuth";
import { APPLICATION_STATUSES, REJECTED_STATUS, WARM_LEAD_FEEDBACK } from "@/constants/applicationStatus";
import { computeDuplicateIds, isPossibleGhost } from "@/lib/applicationFlags";
import { parseObjectId } from "@/lib/objectId";
import type { Application as App } from "@/types/application";

const LIGHT = "companyName jobTitle jobPostUrl appliedDate createdAt applicationStatus favourite isGhostJob responseStatus";
const RECENT = "companyName jobTitle applicationStatus appliedDate createdAt favourite priority city country";

/* Everything the overview cards need in one request, computed from a light
   projection instead of shipping every application to the browser. */
export async function GET() {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const userId = parseObjectId(auth.id);

  const [rows, trashCount, recent] = await Promise.all([
    Application.find({ userId }, LIGHT).lean() as unknown as Promise<App[]>,
    Application.countDocuments({ userId, deletedAt: { $ne: null } }),
    Application.find({ userId }, RECENT).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const s of APPLICATION_STATUSES) byStatus[s] = 0;
  let favourites = 0;
  let ghostManual = 0;
  let ghostAuto = 0;
  let warmLeads = 0;

  for (const app of rows) {
    byStatus[app.applicationStatus] = (byStatus[app.applicationStatus] ?? 0) + 1;
    if (app.favourite) favourites++;
    if (app.isGhostJob) ghostManual++;
    else if (isPossibleGhost(app)) ghostAuto++;
    if (app.applicationStatus === REJECTED_STATUS && app.responseStatus === WARM_LEAD_FEEDBACK) warmLeads++;
  }

  const duplicateIds = [...computeDuplicateIds(rows.map((r) => ({ ...r, _id: String(r._id) })))];

  return NextResponse.json({
    total: rows.length,
    byStatus,
    favourites,
    ghostManual,
    ghostAuto,
    warmLeads,
    duplicates: duplicateIds.length,
    duplicateIds,
    trashCount,
    recent,
  });
}
