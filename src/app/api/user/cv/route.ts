export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";
import { listCVFiles } from "@/lib/cvFiles";
import { importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import type { CVPrimaryFiles } from "@/types/cv";

const FORM_FIELDS = [
  "name", "title", "email", "phone", "location",
  "linkedin", "website", "summary", "experience",
  "education", "skills", "languages", "photo",
] as const;

const PRIMARY_KEYS: (keyof CVPrimaryFiles)[] = [
  "cv", "resume", "coverLetter", "profilePhoto", "coverImage",
];

const TEMPLATE_TABS = ["ats", "europass", "designer"];

const PROJECTION = { uploadedFiles: 0 };

type ProfileDoc = Record<string, unknown> & {
  content?: unknown;
  contentReady?: boolean;
  primary?: Partial<CVPrimaryFiles>;
  mainFileId?: string;
};

function withPrimary(profile: ProfileDoc | null) {
  const primary = (profile?.primary ?? {}) as Partial<CVPrimaryFiles>;
  return {
    cv: primary.cv || profile?.mainFileId || "",
    resume: primary.resume ?? "",
    coverLetter: primary.coverLetter ?? "",
    profilePhoto: primary.profilePhoto ?? "",
    coverImage: primary.coverImage ?? "",
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const [doc, files] = await Promise.all([
    CVProfile.findOne({ userId: auth.id }, PROJECTION).lean() as Promise<ProfileDoc | null>,
    listCVFiles(auth.id),
  ]);

  let content = normaliseContent(doc?.content);
  let contentReady = Boolean(doc?.contentReady);

  if (doc && !contentReady && isContentEmpty(content)) {
    content = importFromLegacy(doc as never);
    contentReady = true;
    await CVProfile.updateOne(
      { userId: auth.id },
      { $set: { content, contentReady: true } },
    );
  }

  return NextResponse.json({
    ...(doc ?? {}),
    content,
    contentReady,
    primary: withPrimary(doc),
    uploadedFiles: files,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json();
  const data: Record<string, unknown> = { userId: auth.id };

  for (const k of FORM_FIELDS) {
    if (typeof body[k] === "string") data[k] = body[k];
  }
  if (typeof body.templateTab === "string" && TEMPLATE_TABS.includes(body.templateTab)) {
    data.templateTab = body.templateTab;
  }
  if (Number.isInteger(body.templateIdx) && body.templateIdx >= 0 && body.templateIdx <= 2) {
    data.templateIdx = body.templateIdx;
  }
  if (body.content && typeof body.content === "object") {
    data.content = normaliseContent(body.content);
    data.contentReady = true;
  }
  if (body.primary && typeof body.primary === "object") {
    const primary = body.primary as Record<string, unknown>;
    for (const key of PRIMARY_KEYS) {
      if (typeof primary[key] === "string") data[`primary.${key}`] = primary[key];
    }
    if (typeof primary.cv === "string") data.mainFileId = primary.cv;
  }

  const [doc, files] = await Promise.all([
    CVProfile.findOneAndUpdate(
      { userId: auth.id },
      { $set: data },
      { upsert: true, new: true, projection: PROJECTION },
    ).lean() as Promise<ProfileDoc | null>,
    listCVFiles(auth.id),
  ]);

  return NextResponse.json({
    ...(doc ?? {}),
    content: normaliseContent(doc?.content),
    contentReady: Boolean(doc?.contentReady),
    primary: withPrimary(doc),
    uploadedFiles: files,
  });
}
