export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AdminAction from "@/models/AdminAction";
import { requireAction } from "@/lib/serverAuth";
import { parsePage } from "@/lib/pagination";
import { parseObjectId } from "@/lib/objectId";
import { ADMIN_ACTIONS } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireAction("view:audit");
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePage(searchParams, { defaultLimit: 50, maxLimit: 100 });
  const action = searchParams.get("action");
  const actorId = searchParams.get("actorId");
  const targetId = searchParams.get("targetId")?.trim();
  const since = searchParams.get("since");

  const filter: Record<string, unknown> = {};
  if (action && (ADMIN_ACTIONS as readonly string[]).includes(action)) filter.action = action;
  if (actorId && parseObjectId(actorId)) filter.actorId = parseObjectId(actorId);
  if (targetId) filter.targetId = targetId.slice(0, 64);
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $gte: d };
  }

  const [items, total] = await Promise.all([
    AdminAction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdminAction.countDocuments(filter),
  ]);

  return NextResponse.json({
    items: items.map((row) => ({
      _id: String(row._id),
      at: row.createdAt,
      actor: { id: row.actorId ? String(row.actorId) : null, email: row.actorEmail },
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      targetLabel: row.targetLabel,
      before: row.before ?? null,
      after: row.after ?? null,
      ip: row.ip,
    })),
    total,
    page,
    limit,
    actions: ADMIN_ACTIONS,
  });
}
