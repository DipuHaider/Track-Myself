export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import Todo from "@/models/Todo";
import Notification from "@/models/Notification";
import IssueReport from "@/models/IssueReport";
import CVProfile from "@/models/CVProfile";
import CVFile from "@/models/CVFile";
import Document from "@/models/Document";
import JobSearch from "@/models/JobSearch";
import JobLead from "@/models/JobLead";
import ApiToken from "@/models/ApiToken";
import { requireAuth } from "@/lib/serverAuth";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import { profileView, USER_PROFILE_SELECT } from "@/lib/serialisers/user";

/* Everything the account owns, as one JSON document, without file bytes —
   those are a separate download per file. Enough for a GDPR access request
   or for leaving with your data; small enough to build in one request. */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `account-export:user:${auth.id}`, limit: 3, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "You can export three times an hour.");

  await dbConnect();
  const userId = auth.id;

  const [user, applications, todos, notifications, issues, cvProfile, cvFiles, documents, jobSearches, jobLeads, apiTokens] = await Promise.all([
    User.findById(userId, USER_PROFILE_SELECT).lean(),
    Application.find({ userId }).setOptions({ withDeleted: true }).sort({ createdAt: -1 }).lean(),
    Todo.find({ userId }).lean(),
    Notification.find({ userId }).sort({ createdAt: -1 }).lean(),
    IssueReport.find({ userId }).lean(),
    CVProfile.findOne({ userId }, { uploadedFiles: 0 }).lean(),
    CVFile.find({ userId }, { data: 0, genContent: 0 }).lean(),
    Document.find({ userId }, { data: 0 }).lean(),
    JobSearch.find({ userId }).lean(),
    JobLead.find({ userId }).lean(),
    ApiToken.find({ userId }, { hash: 0 }).lean(),
  ]);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const applicationIds = applications.map((a) => a._id);
  const interviews = await Interview.find({ applicationId: { $in: applicationIds } }).lean();

  const payload = {
    exportedAt: new Date().toISOString(),
    format: "trackmyself-export/1",
    account: profileView(user as Record<string, unknown>),
    applications,
    interviews,
    todos,
    notifications,
    issueReports: issues,
    cvProfile,
    cvFiles,
    attachments: documents,
    jobSearches,
    jobLeads,
    apiTokens,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trackmyself-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
