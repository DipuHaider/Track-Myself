export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";
import { readCVFile } from "@/lib/cvFiles";
import { importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import { PDF_MIME, renderCVPdf, renderCoverLetterPdf, renderTailoredResumePdf } from "@/lib/cv/pdf";
import { buildMergedCV } from "@/lib/cv/import/sources";
import { isPremiumUser, isSuperAdmin } from "@/lib/permissions";
import { readPhotoDataUri } from "@/lib/cvFiles";
import type { CVFormat, CVVariant } from "@/types/cv";

type StoredFile = {
  name: string; mimeType: string; data: string;
  generated?: boolean; genFormat?: string; genVariant?: string;
  genDocType?: string; genFor?: string;
} & Record<string, unknown>;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await dbConnect();

  const file = (await readCVFile(auth.id, id)) as StoredFile | null;
  if (!file?.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const wantsPdf = url.searchParams.get("as") === "pdf";

  /* On-screen preview of a document we generated as Word: re-render the same format
     to PDF so it can be shown in a viewer. Viewing is not exporting — the PDF file
     download stays behind canExportPdf. */
  if (wantsPdf && file.mimeType !== PDF_MIME) {
    if (!file.generated) {
      return NextResponse.json(
        { error: "Only documents TrackMyself generated can be previewed as PDF." },
        { status: 422 },
      );
    }

    const doc = (await CVProfile.findOne(
      { userId: auth.id },
      { uploadedFiles: 0 },
    ).lean()) as (Record<string, unknown> & { content?: unknown; primary?: { profilePhoto?: string } }) | null;

    let content = normaliseContent(doc?.content);
    if (isContentEmpty(content) && doc) content = importFromLegacy(doc as never);

    const premium = isSuperAdmin(auth.role) || isPremiumUser(auth.role, auth.plan);
    const merged = await buildMergedCV(auth.id, {
      includeJson: premium,
      formContent: isContentEmpty(content) ? undefined : content,
    });
    if (merged.content && !isContentEmpty(merged.content)) content = merged.content;

    if (!content.photo && doc?.primary?.profilePhoto) {
      content = { ...content, photo: await readPhotoDataUri(auth.id, doc.primary.profilePhoto) };
    }

    if (isContentEmpty(content)) {
      return NextResponse.json({ error: "Your CV is empty." }, { status: 400 });
    }

    const format = (file.genFormat || "ats") as CVFormat;
    const variant = (file.genVariant || "full") as CVVariant;
    const info = {
      companyName: (file.genFor ?? "").split("—")[0]?.trim() || "the company",
      jobTitle: (file.genFor ?? "").split("—")[1]?.trim() || "the role",
    };

    const pdf =
      file.genDocType === "cover-letter" ? await renderCoverLetterPdf(content, info)
      : file.genDocType === "resume" ? await renderTailoredResumePdf(content, info, variant)
      : await renderCVPdf(content, format, variant);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": PDF_MIME,
        "Content-Length": String(pdf.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name.replace(/\.docx?$/i, ".pdf"))}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const bytes = Buffer.from(file.data, "base64");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
