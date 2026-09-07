export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";
import { importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import {
  DOCX_MIME, appDocFileName, cvFileName, renderCVDocx,
  renderCoverLetterDocx, renderTailoredResumeDocx, type AppInfo,
} from "@/lib/cv/docx";
import { readPhotoDataUri } from "@/lib/cvFiles";
import { canUseLebenslauf } from "@/lib/permissions";
import { CV_FORMATS, CV_VARIANTS, type CVFormat, type CVVariant } from "@/types/cv";

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

  await dbConnect();

  const doc = (await CVProfile.findOne(
    { userId: auth.id },
    { uploadedFiles: 0 },
  ).lean()) as ProfileDoc | null;

  let content = normaliseContent(doc?.content);
  if (isContentEmpty(content) && doc) content = importFromLegacy(doc as never);

  if (body.content && typeof body.content === "object") {
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

  let buffer: Buffer;
  let filename: string;

  if (docType === "cover-letter" && appInfo) {
    buffer = await renderCoverLetterDocx(content, appInfo);
    filename = appDocFileName(content, appInfo, docType);
  } else if (docType === "resume" && appInfo) {
    buffer = await renderTailoredResumeDocx(content, appInfo, variant);
    filename = appDocFileName(content, appInfo, docType);
  } else {
    buffer = await renderCVDocx(content, format, variant);
    filename = cvFileName(content, format, variant);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
