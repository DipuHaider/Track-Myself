export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import User from "@/models/User";
import { requireAction } from "@/lib/serverAuth";
import { parseObjectId } from "@/lib/objectId";
import { envelope, parsePage } from "@/lib/pagination";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";

const LIST_CAP = 500;
const PROJECTION = "-jobDescription -statusHistory";

type UserRow = { _id: unknown; name: string; email: string; role: string; plan: string };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const auth = await requireAction("view:applications");
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const userId = searchParams.get("userId")?.trim();

  const filter: Record<string, unknown> = {};
  const status = searchParams.get("status");
  const paged = searchParams.has("page");
  if (status && (APPLICATION_STATUSES as readonly string[]).includes(status)) filter.applicationStatus = status;
  if (userId) {
    if (!parseObjectId(userId)) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    filter.userId = userId;
  }
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [
      { companyName: rx },
      { jobTitle: rx },
      { location: rx },
      { country: rx },
      { notes: rx },
    ];
  }

    const page = parsePage(searchParams, { defaultLimit: 50, maxLimit: 100 });
  const query = Application.find(filter, PROJECTION).sort({ createdAt: -1 });
  const [applications, total] = await Promise.all([
    (paged ? query.skip(page.skip).limit(page.limit) : query.limit(LIST_CAP)).lean(),
    paged ? Application.countDocuments(filter) : Promise.resolve(0),
  ]);

  const ownerIds = [...new Set(applications.map((a) => String(a.userId)))];
  const owners = (await User.find(
    { _id: { $in: ownerIds } },
    "name email role plan",
  ).lean()) as unknown as UserRow[];

  const ownerById = new Map(owners.map((u) => [String(u._id), u]));

  const rows = applications.map((app) => {
    const owner = ownerById.get(String(app.userId));
    return {
      ...app,
      _id: String(app._id),
      userId: String(app.userId),
      owner: owner
        ? { _id: String(owner._id), name: owner.name, email: owner.email, role: owner.role, plan: owner.plan }
        : null,
    };
  });

  return NextResponse.json(paged ? envelope(rows, total, page) : rows);
}
