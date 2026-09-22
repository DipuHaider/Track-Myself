export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAction } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import IssueReport from "@/models/IssueReport";
import User from "@/models/User";
import { sendIssueMail } from "@/lib/mail";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAction("manage:issues");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const { id } = await params;
  const report = await IssueReport.findById(id).lean() as
    | {
        _id: unknown; userId?: unknown; email?: string; role?: string; category?: string;
        message?: string; url?: string; viewport?: string; userAgent?: string;
      }
    | null;
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reporter = (await User.findById(report.userId, "name").lean()) as { name?: string } | null;

  const mail = await sendIssueMail({
    category: report.category ?? "Bug",
    message: report.message ?? "",
    url: report.url ?? "",
    viewport: report.viewport ?? "",
    userAgent: report.userAgent ?? "",
    reporterName: reporter?.name ?? "A TrackMyself user",
    reporterEmail: report.email ?? "",
    reporterRole: report.role ?? "",
    reportId: String(report._id),
  });

  const updated = await IssueReport.findByIdAndUpdate(
    id,
    {
      notifiedAt: mail.ok ? new Date() : null,
      notifyError: mail.ok ? "" : (mail.error ?? "").slice(0, 300),
    },
    { new: true },
  );

  return NextResponse.json({ ok: mail.ok, error: mail.error ?? "", report: updated });
}
