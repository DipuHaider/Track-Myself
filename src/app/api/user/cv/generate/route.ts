export const dynamic = "force-dynamic";

import { draftCoverLetter, sanitizeLetter } from "@/lib/cv/coverLetter";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import { isTooThinToPrint, resolveGenerationContent } from "@/lib/cv/generatePipeline";
import { generatedFileName } from "@/lib/cv/fileName";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import { saveGeneratedFile } from "@/lib/cv/saveGenerated";
import {
  DOCX_MIME, renderCVDocx,
  renderCoverLetterDocx, renderTailoredResumeDocx, type AppInfo,
} from "@/lib/cv/docx";
import {
  PDF_MIME, renderCVPdf, renderCoverLetterPdf, renderTailoredResumePdf,
} from "@/lib/cv/pdf";
import {
  canExportPdf, canUseAppDocs, canUseCVFormat, canUseLebenslauf,
} from "@/lib/permissions";
import { tailorToApplication } from "@/lib/cv/import/merge";
import { CV_FORMATS, CV_VARIANTS, type CVFormat, type CVVariant } from "@/types/cv";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `cv-generate:user:${auth.id}`, limit: 30, windowMs: 10 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "Too many documents generated at once. Try again in a few minutes.");

  const body = await req.json().catch(() => ({}));
  const format = (body.format ?? "ats") as CVFormat;
  const variant = (body.variant ?? "full") as CVVariant;
  const docType = (body.docType ?? "cv") as "cv" | "resume" | "cover-letter";
  const output = body.output === "pdf" ? "pdf" : "docx";
  const appInfo = body.appInfo as AppInfo | undefined;

  if (docType !== "cv" && !appInfo?.companyName) {
    return NextResponse.json(
      { error: "Company and job title are required for this document." },
      { status: 400 },
    );
  }
  if (!CV_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Unknown CV format." }, { status: 400 });
  }
  if (!CV_VARIANTS.includes(variant)) {
    return NextResponse.json({ error: "Unknown CV variant." }, { status: 400 });
  }
  if (format === "lebenslauf" && !canUseLebenslauf(auth.role)) {
    return NextResponse.json(
      { error: "The Lebenslauf format is not available on your account." },
      { status: 403 },
    );
  }

  /* A plain CV is gated by the entitlement matrix. Per-application resumes and cover
     letters have their own gate below and always render from the ATS builder. */
  if (docType === "cv" && !canUseCVFormat(auth.role, auth.plan, format, variant)) {
    return NextResponse.json(
      {
        error: "That CV format is not available on your plan.",
        upgrade: true,
      },
      { status: 403 },
    );
  }

  if (output === "pdf" && !canExportPdf(auth.role, auth.plan)) {
    return NextResponse.json(
      { error: "PDF export is a Premium feature. Your plan includes Word downloads.", upgrade: true },
      { status: 403 },
    );
  }

  if (docType !== "cv" && !canUseAppDocs(auth.role, auth.plan)) {
    return NextResponse.json(
      {
        error: "Per-application documents are a Premium feature.",
        upgrade: true,
      },
      { status: 403 },
    );
  }

  const resolved = await resolveGenerationContent(auth, body);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  let content = resolved.content;

  /* Job-specific layer: bias the merged CV toward the application the Docs menu
     was opened from. Reorders only — nothing is invented.

     Skipped when the caller already tailored: the review modal sends back the exact
     content the user accepted, and re-sorting it here would make the downloaded file
     disagree with the diff they just approved. */
  if (docType !== "cv" && appInfo && body.pretailored !== true) {
    content = tailorToApplication(content, {
      jobTitle: appInfo.jobTitle,
      companyName: appInfo.companyName,
      location: appInfo.location,
      notes: appInfo.notes,
      jobPostUrl: appInfo.jobPostUrl,
      platform: appInfo.platform,
    });
  }

  if (isTooThinToPrint(content)) {
    return NextResponse.json(
      { error: "There is not enough here to build a CV. Add your name and at least one section — summary, experience, education or skills." },
      { status: 400 },
    );
  }

  let buffer: Buffer;
  let filename: string;
  const naming = generatedFileName({ content, info: appInfo, docType, format, variant, output });

  const letter = docType === "cover-letter" && appInfo
    ? sanitizeLetter(body.letter) ?? draftCoverLetter(content, appInfo)
    : null;

  if (docType === "cover-letter" && appInfo && letter) {
    buffer = output === "pdf"
      ? await renderCoverLetterPdf(content, appInfo, letter)
      : await renderCoverLetterDocx(content, appInfo, letter);
    filename = naming.name;
  } else if (docType === "resume" && appInfo) {
    buffer = output === "pdf"
      ? await renderTailoredResumePdf(content, appInfo, variant)
      : await renderTailoredResumeDocx(content, appInfo, variant);
    filename = naming.name;
  } else {
    buffer = output === "pdf"
      ? await renderCVPdf(content, format, variant)
      : await renderCVDocx(content, format, variant);
    filename = naming.name;
  }

  const isPdf = filename.endsWith(".pdf");

  /* The photo is a data URI up to 3 MB — keeping it in the snapshot would roughly
     double the row. It is re-injected from the profile on re-render. */
  const snapshot = JSON.stringify({ ...content, photo: "", ...(letter ? { coverLetter: letter } : {}) });

  /* Keep a copy in My Docs. */
  if (body.save !== false) {
    const genFor = docType === "cv" ? "" : `${appInfo?.companyName ?? ""} — ${appInfo?.jobTitle ?? ""}`.trim();
    try {
      await saveGeneratedFile({
        userId: auth.id,
        buffer,
        filename,
        format,
        variant,
        docType,
        genFor,
        isoDate: naming.isoDate,
        snapshot,
        genTailor: String(body.genTailor ?? ""),
        genNote: String(body.genNote ?? ""),
        applicationId: typeof body.applicationId === "string" && /^[a-f0-9]{24}$/i.test(body.applicationId) ? body.applicationId : undefined,
      });
    } catch {
      /* the download is what matters — never fail it because the copy did not save */
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": isPdf ? PDF_MIME : DOCX_MIME,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
