export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { historyActor, initialHistory, isValidationError, linkAttachments, sanitizeUpdate, validationMessage } from "@/lib/applicationHistory";
import { requireActiveAuth } from "@/lib/serverAuth";
import { purgeExpiredApplications } from "@/lib/applicationTrash";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";
import { computeDuplicateGroups, isPossibleGhost, isWarmLead } from "@/lib/applicationFlags";
import { envelope, parsePage } from "@/lib/pagination";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import type { Application as App } from "@/types/application";

const LIST_CAP = 500;
const LIST_PROJECTION = "-jobDescription";
const SORTS: Record<string, Record<string, 1 | -1>> = {
  createdAt: { createdAt: -1 },
  appliedDate: { appliedDate: -1, createdAt: -1 },
  updatedAt: { updatedAt: -1 },
  companyName: { companyName: 1 },
};
const PURGE_EVERY_MS = 60 * 60 * 1000;
const lastPurge = new Map<string, number>();

/* The trash purge used to run on every list read; once an hour per user is
   plenty, and the daily maintenance job is the real owner. */
async function maybePurge(userId: string) {
  const now = Date.now();
  if (now - (lastPurge.get(userId) ?? 0) < PURGE_EVERY_MS) return;
  lastPurge.set(userId, now);
  await purgeExpiredApplications({ userId }).catch(() => {});
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  await maybePurge(userId);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const favourite = searchParams.get("favourite") === "1";
  const flag = searchParams.get("flag") ?? "";
  const sortKey = searchParams.get("sort") ?? "createdAt";
  const paged = searchParams.has("page");

  const filter: Record<string, unknown> = { userId };
  if (q) {
    const rx = { $regex: escapeRegex(q.slice(0, 120)), $options: "i" };
    filter.$or = [
      { companyName: rx },
      { jobTitle: rx },
      { notes: rx },
    ];
  }
  if (status && (APPLICATION_STATUSES as readonly string[]).includes(status)) filter.applicationStatus = status;
  if (favourite) filter.favourite = true;
  if (flag === "ghost-manual") filter.isGhostJob = true;
  const priority = searchParams.get("priority");
  if (priority && ["Low", "Medium", "High"].includes(priority)) filter.priority = priority;
  const type = searchParams.get("type")?.trim().slice(0, 40);
  if (type) filter.jobType = { $regex: `(^|,\\s*)${escapeRegex(type)}(\\s*,|$)`, $options: "i" };

  const sort = SORTS[sortKey] ?? SORTS.createdAt;

  /* Without ?page the full list still comes back (the current client expects an
     array); with it, an envelope of light rows. Flags that need the whole set —
     duplicates, warm leads, automatic ghosts — are computed over the user's rows
     once and attached per item in both modes. */
  if (!paged) {
    const applications = (await Application.find(filter).sort(sort).limit(LIST_CAP).lean()) as unknown as App[];
    const dupes = computeDuplicateGroups(applications.map((a) => ({ ...a, _id: String(a._id) })));
    return NextResponse.json(
      applications.map((a) => ({ ...a, duplicateKind: dupes.get(String(a._id)) ?? null })),
    );
  }

  const page = parsePage(searchParams, { defaultLimit: 25, maxLimit: 100 });
  const light = (await Application.find({ userId }, "companyName jobTitle jobPostUrl appliedDate createdAt applicationStatus responseStatus isGhostJob").lean()) as unknown as App[];
  const dupes = computeDuplicateGroups(light.map((a) => ({ ...a, _id: String(a._id) })));

  if (flag === "duplicate" || flag === "warm" || flag === "ghost-auto") {
    const ids = light
      .filter((a) =>
        flag === "duplicate" ? dupes.has(String(a._id)) : flag === "warm" ? isWarmLead(a) : !a.isGhostJob && isPossibleGhost(a),
      )
      .map((a) => a._id);
    filter._id = { $in: ids };
  }

  const [items, total] = await Promise.all([
    Application.find(filter, LIST_PROJECTION).sort(sort).skip(page.skip).limit(page.limit).lean() as unknown as Promise<App[]>,
    Application.countDocuments(filter),
  ]);

  return NextResponse.json(
    envelope(items.map((a) => ({ ...a, duplicateKind: dupes.get(String(a._id)) ?? null })), total, page),
  );
}

export async function POST(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  const gate = await checkRateLimitDb({ key: `app-create:user:${userId}`, limit: 60, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "That is a lot of applications for one hour. Try again shortly.");

  await dbConnect();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  if (!body.force) {
    const existing = await Application.findOne({
      userId,
      companyName: { $regex: `^${escapeRegex(body.companyName ?? "")}$`, $options: "i" },
      jobTitle:    { $regex: `^${escapeRegex(body.jobTitle ?? "")}$`,    $options: "i" },
    }).select("_id companyName jobTitle appliedDate applicationStatus").lean();

    if (existing) {
      return NextResponse.json({ error: "duplicate", existing }, { status: 409 });
    }
  }

  const data = sanitizeUpdate(body);
  delete data.force;
  try {
    const application = await Application.create({
      ...data,
      userId,
      statusHistory: initialHistory(data.applicationStatus, await historyActor(userId)),
    });
    await linkAttachments(application);
    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    if (isValidationError(err)) return NextResponse.json({ error: validationMessage(err) }, { status: 400 });
    throw err;
  }
}
