export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireActiveAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { resolveGenerationContent } from "@/lib/cv/generatePipeline";
import { getUserCredential } from "@/lib/ai/userKey";
import { analyseJobFit, keywordGaps, JD_LIMIT } from "@/lib/ai/jobFit";
import type { Actor } from "@/lib/ai/gateway";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await dbConnect();

  const application = (await Application.findOne(
    { _id: id, userId: auth.id },
    "companyName jobTitle jobDescription notes",
  ).lean()) as
    | { companyName?: string; jobTitle?: string; jobDescription?: string; notes?: string }
    | null;

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jobDescription = (application.jobDescription || application.notes || "").trim();
  if (jobDescription.length < 120) {
    return NextResponse.json(
      {
        error:
          "There is no job description saved for this application yet. Save the posting text, or capture the job with the browser extension, and try again.",
      },
      { status: 400 },
    );
  }

  const resolved = await resolveGenerationContent(auth, {});
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const actor: Actor = { kind: "user", id: auth.id, role: auth.role, plan: auth.plan };

  const analysis = await analyseJobFit({
    cv: resolved.content,
    jobDescription: jobDescription.slice(0, JD_LIMIT),
    actor,
    userKey: await getUserCredential(auth.id),
  });

  return NextResponse.json({
    company: application.companyName ?? "",
    jobTitle: application.jobTitle ?? "",
    ...analysis,
  });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await dbConnect();

  /* The free, zero-inference view. It spends nothing, so it needs no allowance
     and can be shown before the user decides to run the real analysis. */
  const application = (await Application.findOne(
    { _id: id, userId: auth.id },
    "jobDescription notes",
  ).lean()) as { jobDescription?: string; notes?: string } | null;

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jobDescription = (application.jobDescription || application.notes || "").trim();
  if (jobDescription.length < 120) {
    return NextResponse.json({ mode: "keyword", items: [], note: "No job description saved yet." });
  }

  const resolved = await resolveGenerationContent(auth, {});
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  return NextResponse.json(keywordGaps(resolved.content, jobDescription));
}
