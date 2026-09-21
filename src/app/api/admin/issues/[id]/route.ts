export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAction } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import IssueReport from "@/models/IssueReport";
import { ISSUE_STATUSES, type IssueStatus } from "@/constants/issues";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAction("manage:issues");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const update: Record<string, unknown> = {};

  if (ISSUE_STATUSES.includes(body?.status as IssueStatus)) update.status = body.status;
  if (typeof body?.note === "string") update.note = body.note.slice(0, 500);

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const report = await IssueReport.findByIdAndUpdate(id, update, { new: true });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(report);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAction("manage:issues");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const { id } = await params;
  const removed = await IssueReport.findByIdAndDelete(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
