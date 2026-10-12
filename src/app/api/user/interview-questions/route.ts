export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Packer } from "docx";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireActiveAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { canExportPdf, canUseAppDocs } from "@/lib/permissions";
import { buildInterviewQuestions } from "@/lib/cv/docx/interviewQuestions";
import { InterviewQuestionsDocument } from "@/lib/cv/pdf/interviewQuestions";
import { aiQuestions } from "@/lib/interview/ai";
import { getUserCredential } from "@/lib/ai/userKey";
import type { Actor } from "@/lib/ai/gateway";
import { buildQuestionSet, clampCount } from "@/lib/interview/select";
import { SECTION_LABELS } from "@/lib/interview/bank";
import { isoToday, slugPart } from "@/lib/cv/fileName";
import { cacheKey, findInterviewDraft, saveInterviewDraft } from "@/lib/cv/draftCache";
import type { QuestionSection } from "@/lib/interview/bank";
import type { AppInfo } from "@/lib/cv/docx";
import { parseObjectId } from "@/lib/objectId";

export async function POST(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const mode = body?.mode === "preview" ? "preview" : "download";

  /* Reading questions on screen is open to every signed-in account (the AI
     top-up draws on the free allowance or the user's own key). Taking them away
     as a document is the Premium perk. */
  if (mode === "download" && !canUseAppDocs(auth.role, auth.plan)) {
    return NextResponse.json(
      { error: "Downloading interview prep is a Premium feature.", upgrade: true },
      { status: 403 },
    );
  }
  const output = body?.output === "pdf" ? "pdf" : "docx";
  const count = clampCount(body?.count);
  const fresh = body?.fresh === true;
  const applicationId = typeof body?.applicationId === "string" && parseObjectId(body.applicationId) ? body.applicationId : "";

  if (mode === "download" && output === "pdf" && !canExportPdf(auth.role, auth.plan)) {
    return NextResponse.json(
      { error: "PDF export is a Premium feature.", upgrade: true },
      { status: 403 },
    );
  }

  const info: AppInfo = {
    companyName: String(body?.appInfo?.companyName ?? "").trim(),
    jobTitle: String(body?.appInfo?.jobTitle ?? "").trim(),
    location: body?.appInfo?.location ? String(body.appInfo.location) : undefined,
    jobDescription: body?.appInfo?.jobDescription ? String(body.appInfo.jobDescription) : undefined,
  };

  if (!info.companyName || !info.jobTitle) {
    return NextResponse.json({ error: "Pick an application first." }, { status: 400 });
  }

  await dbConnect();

  /* Previously issued questions live on the application, so "only new ones"
     survives reloads and follows the role rather than the browser. */
  let seen: string[] = [];
  if (applicationId) {
    const app = (await Application.findOne(
      { _id: applicationId, userId: auth.id },
      "interviewSeen",
    ).lean()) as { interviewSeen?: string[] } | null;
    seen = app?.interviewSeen ?? [];
  }

  /* The model's top-up is cached per job, so previewing and then downloading
     the same paper costs one call, not two. */
  const draftKey = cacheKey([info.jobTitle, info.companyName, (info.jobDescription ?? "").slice(0, 4000)]);
  const cachedExtra = await findInterviewDraft(auth.id, draftKey);
  const extra = cachedExtra
    ? cachedExtra.map((r) => ({ text: r.text, section: r.section as QuestionSection }))
    : await aiQuestions({
        jobTitle: info.jobTitle,
        companyName: info.companyName,
        jobDescription: info.jobDescription,
        actor: { kind: "user", id: auth.id, role: auth.role, plan: auth.plan, status: auth.status } as Actor,
        userKey: await getUserCredential(auth.id),
      });
  if (!cachedExtra && extra.length) {
    await saveInterviewDraft(auth.id, draftKey, `${info.companyName} – ${info.jobTitle}`, extra);
  }

  const set = buildQuestionSet({
    jobTitle: info.jobTitle,
    companyName: info.companyName,
    jobDescription: info.jobDescription,
    extra,
    count,
    exclude: fresh ? seen : [],
  });

  if (applicationId) {
    await Application.updateOne(
      { _id: applicationId, userId: auth.id },
      { $addToSet: { interviewSeen: { $each: set.ids } } },
    );
  }

  if (mode === "preview") {
    return NextResponse.json({
      total: set.total,
      family: set.family,
      aiCount: set.aiCount,
      exhausted: set.exhausted,
      seenBefore: seen.length,
      sections: set.sections
        .filter((s) => s.questions.length > 0)
        .map((s) => ({
          label: SECTION_LABELS[s.section],
          questions: s.questions.map((q) => ({
            text: q.text,
            prompt: q.prompt ?? "",
            answer: q.answer ?? "",
          })),
        })),
    });
  }

  const buffer =
    output === "pdf"
      ? await renderToBuffer(InterviewQuestionsDocument({ set, info }))
      : Buffer.from(await Packer.toBuffer(buildInterviewQuestions(set, info)));

  const name = `${slugPart(info.companyName)}_${slugPart(info.jobTitle)}_Interview-Questions_${isoToday()}.${output}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        output === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Question-Count": String(set.total),
      "X-Question-AI": String(set.aiCount),
      "X-Question-Exhausted": String(set.exhausted),
    },
  });
}
