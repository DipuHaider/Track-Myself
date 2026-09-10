export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";
import CVFile from "@/models/CVFile";
import { importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import {
  DOCX_MIME, appDocFileName, cvFileName, renderCVDocx,
  renderCoverLetterDocx, renderTailoredResumeDocx, type AppInfo,
} from "@/lib/cv/docx";
import { readPhotoDataUri } from "@/lib/cvFiles";
import {
  PDF_MIME, cvPdfFileName, renderCVPdf, renderCoverLetterPdf, renderTailoredResumePdf,
} from "@/lib/cv/pdf";
import {
  canExportPdf, canUseAppDocs, canUseCVFormat, canUseLebenslauf,
  isPremiumUser, isSuperAdmin,
} from "@/lib/permissions";
import { buildMergedCV } from "@/lib/cv/import/sources";
import { tailorToApplication } from "@/lib/cv/import/merge";
import { CV_FORMATS, CV_VARIANTS, type CVContent, type CVFormat, type CVVariant } from "@/types/cv";

const CONTENT_MAX = 200_000;

/**
 * isContentEmpty only catches a *completely* blank profile, so a malformed override
 * like { name: "X" } produced a one-line document and a 200. A CV needs a name and
 * at least one section worth printing.
 */
function isTooThinToPrint(c: CVContent) {
  const hasBody =
    Boolean(c.summary.trim()) ||
    c.experience.length > 0 ||
    c.education.length > 0 ||
    c.skills.length > 0 ||
    c.projects.length > 0;
  return !c.name.trim() || !hasBody;
}

type ProfileDoc = Record<string, unknown> & {
  content?: unknown;
  primary?: { profilePhoto?: string };
};

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

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
  if (format === "lebenslauf" && !canUseLebenslauf(auth.role, auth.email)) {
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

  await dbConnect();

  const doc = (await CVProfile.findOne(
    { userId: auth.id },
    { uploadedFiles: 0 },
  ).lean()) as ProfileDoc | null;

  let content = normaliseContent(doc?.content);
  if (isContentEmpty(content) && doc) content = importFromLegacy(doc as never);

  /* ── the data cascade ──
     Uploaded CVs and imported JSON fill whatever the CV Builder form leaves blank.
     The form always outranks them, so this can only add, never overwrite. Opt out
     with useSources: false when you want the typed CV exactly as it stands. */
  if (body.useSources !== false) {
    const premium = isSuperAdmin(auth.role) || isPremiumUser(auth.role, auth.plan);
    const merged = await buildMergedCV(auth.id, {
      includeJson: premium,
      formContent: isContentEmpty(content) ? undefined : content,
    });
    if (merged.content && !isContentEmpty(merged.content)) content = merged.content;
  }

  if (body.content && typeof body.content === "object") {
    if (JSON.stringify(body.content).length > CONTENT_MAX) {
      return NextResponse.json(
        { error: "That CV is too large to generate. Trim some detail and try again." },
        { status: 413 },
      );
    }
    content = normaliseContent(body.content);
  }

  if (!content.photo && doc?.primary?.profilePhoto) {
    content = { ...content, photo: await readPhotoDataUri(auth.id, doc.primary.profilePhoto) };
  }

  if (isContentEmpty(content)) {
    return NextResponse.json(
      { error: "Your CV is empty. Add your details in the CV Builder first." },
      { status: 400 },
    );
  }

  /* Job-specific layer: bias the merged CV toward the application the Docs menu
     was opened from. Reorders only — nothing is invented. */
  if (docType !== "cv" && appInfo) {
    content = tailorToApplication(content, {
      jobTitle: appInfo.jobTitle,
      companyName: appInfo.companyName,
      location: appInfo.location,
      notes: appInfo.notes,
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

  if (docType === "cover-letter" && appInfo) {
    buffer = output === "pdf"
      ? await renderCoverLetterPdf(content, appInfo)
      : await renderCoverLetterDocx(content, appInfo);
    filename = appDocFileName(content, appInfo, docType).replace(
      /\.docx$/,
      output === "pdf" ? ".pdf" : ".docx",
    );
  } else if (docType === "resume" && appInfo) {
    buffer = output === "pdf"
      ? await renderTailoredResumePdf(content, appInfo, variant)
      : await renderTailoredResumeDocx(content, appInfo, variant);
    filename = appDocFileName(content, appInfo, docType).replace(
      /\.docx$/,
      output === "pdf" ? ".pdf" : ".docx",
    );
  } else {
    buffer = output === "pdf"
      ? await renderCVPdf(content, format, variant)
      : await renderCVDocx(content, format, variant);
    filename = output === "pdf"
      ? cvPdfFileName(content, format, variant)
      : cvFileName(content, format, variant);
  }

  const isPdf = filename.endsWith(".pdf");

  /* Keep a copy in My Docs. Upserted on a stable signature so downloading the same
     document twice replaces the entry instead of stacking duplicates. */
  if (body.save !== false && buffer.length < 6 * 1024 * 1024) {
    const genFor = docType === "cv" ? "" : `${appInfo?.companyName ?? ""} — ${appInfo?.jobTitle ?? ""}`.trim();
    try {
      await CVFile.findOneAndUpdate(
        {
          userId: auth.id,
          generated: true,
          genFormat: format,
          genVariant: variant,
          genDocType: docType,
          genOutput: isPdf ? "pdf" : "docx",
          genFor,
        },
        {
          $set: {
            userId: auth.id,
            category: docType === "cover-letter" ? "cover-letter" : docType === "resume" ? "resume" : "cv",
            name: filename,
            size: buffer.length,
            mimeType: isPdf ? PDF_MIME : DOCX_MIME,
            data: buffer.toString("base64"),
            generated: true,
            genFormat: format,
            genVariant: variant,
            genDocType: docType,
            genOutput: isPdf ? "pdf" : "docx",
            genFor,
            uploadedAt: new Date(),
          },
        },
        { upsert: true },
      );
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
