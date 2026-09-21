export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import IssueReport from "@/models/IssueReport";
import User from "@/models/User";
import { sendIssueMail } from "@/lib/mail/web3forms";
import { notifyBackendTeam } from "@/lib/notifications/create";
import { ISSUE_CATEGORIES, ISSUE_MESSAGE_MAX, type IssueCategory } from "@/constants/issues";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const reports = await IssueReport.find({ userId: auth.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json().catch(() => null);
  if (body?.botcheck) return NextResponse.json({ ok: true }, { status: 201 });

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 8) {
    return NextResponse.json({ error: "Please describe the issue in a bit more detail" }, { status: 400 });
  }

  const recent = await IssueReport.countDocuments({
    userId: auth.id,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });
  if (recent >= 5) {
    return NextResponse.json({ error: "Too many reports — try again in a few minutes" }, { status: 429 });
  }

  const category: IssueCategory = ISSUE_CATEGORIES.includes(body?.category)
    ? body.category
    : "Bug";

  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 400);
  const url = typeof body?.url === "string" ? body.url.slice(0, 500) : "";
  const viewport = typeof body?.viewport === "string" ? body.viewport.slice(0, 40) : "";

  const report = await IssueReport.create({
    userId: auth.id,
    email: auth.email ?? "",
    role: auth.role,
    category,
    message: message.slice(0, ISSUE_MESSAGE_MAX),
    url,
    userAgent,
    viewport,
  });

  const reporter = (await User.findById(auth.id, "name").lean()) as { name?: string } | null;
  const mail = await sendIssueMail({
    category,
    message: message.slice(0, ISSUE_MESSAGE_MAX),
    url,
    viewport,
    userAgent,
    reporterName: reporter?.name ?? "A TrackMyself user",
    reporterEmail: auth.email ?? "",
    reporterRole: auth.role,
    reportId: String(report._id),
  });

  await notifyBackendTeam({
    type: "issue-new",
    title: `New ${category.toLowerCase()} report`,
    body: `${reporter?.name ?? "A user"}: ${message.slice(0, 140)}`,
    href: "/dashboard/issues",
  }, auth.id);

  await IssueReport.findByIdAndUpdate(report._id, {
    notifiedAt: mail.ok ? new Date() : null,
    notifyError: mail.ok ? "" : (mail.error ?? "").slice(0, 300),
  });

  return NextResponse.json(report, { status: 201 });
}
