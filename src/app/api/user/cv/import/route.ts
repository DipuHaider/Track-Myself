export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import { requireAuth } from "@/lib/serverAuth";
import { isContentEmpty, normaliseContent } from "@/lib/cv/content";
import { parseCV } from "@/lib/cv/import/parseText";
import { textForFile, buildMergedCV } from "@/lib/cv/import/sources";
import { isPremiumUser, isSuperAdmin, cvVersionLimit } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rateLimit";

const JSON_MAX = 400_000;

type FileDoc = {
  _id: unknown; name: string; mimeType: string; data: string;
  category: string; parsedText?: string;
};

/** GET — what the cascade currently sees, without changing anything. */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const premium = isSuperAdmin(auth.role) || isPremiumUser(auth.role, auth.plan);
  const { content, report, usedFrom } = await buildMergedCV(auth.id, { includeJson: premium });

  return NextResponse.json({
    sources: report,
    usedFrom,
    hasContent: content ? !isContentEmpty(content) : false,
    versionLimit: cvVersionLimit(auth.role, auth.plan),
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = checkRateLimit({ key: `cv-import:${auth.id}`, limit: 40, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many imports this hour. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const source = String(body.source ?? "file");
  const premium = isSuperAdmin(auth.role) || isPremiumUser(auth.role, auth.plan);

  await dbConnect();

  /* ── read an uploaded CV ── */
  if (source === "file") {
    const fileId = String(body.fileId ?? "");
    if (!fileId) return NextResponse.json({ error: "Which file?" }, { status: 400 });

    const file = (await CVFile.findOne(
      { _id: fileId, userId: auth.id },
      "name mimeType data category parsedText",
    ).lean()) as FileDoc | null;

    if (!file) return NextResponse.json({ error: "That file is not in your library." }, { status: 404 });

    const got = await textForFile(file);
    if (!got) {
      return NextResponse.json(
        { error: "That file could not be read. Upload a .docx or .pdf with selectable text." },
        { status: 422 },
      );
    }

    const parsed = await parseCV(got.text);
    if (isContentEmpty(parsed.content)) {
      return NextResponse.json(
        { error: "No CV fields could be found in that file. Fill the form instead.", found: [] },
        { status: 422 },
      );
    }

    return NextResponse.json({
      content: parsed.content,
      found: parsed.found,
      coverage: Number(parsed.coverage.toFixed(2)),
      characters: got.text.length,
      cached: got.cached,
    });
  }

  /* ── import structured JSON (premium and above) ── */
  if (source === "json") {
    if (!premium) {
      return NextResponse.json(
        { error: "Importing CV versions as JSON is a Premium feature.", upgrade: true },
        { status: 403 },
      );
    }

    const raw = body.data;
    const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? {});
    if (text.length > JSON_MAX) {
      return NextResponse.json({ error: "That JSON is too large." }, { status: 413 });
    }

    let parsedJson: unknown;
    try {
      parsedJson = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return NextResponse.json({ error: "That is not valid JSON." }, { status: 400 });
    }

    const content = normaliseContent(parsedJson);
    if (isContentEmpty(content)) {
      return NextResponse.json(
        { error: "That JSON has no recognisable CV fields. Export one from the builder to see the shape." },
        { status: 422 },
      );
    }

    const label = String(body.label ?? "").slice(0, 60) || `Version ${new Date().toISOString().slice(0, 10)}`;
    const limit = cvVersionLimit(auth.role, auth.plan);

    const profile = await CVProfile.findOne({ userId: auth.id });
    if (!profile) return NextResponse.json({ error: "Save your CV once first." }, { status: 400 });

    const versions = Array.isArray(profile.jsonImports) ? profile.jsonImports : [];
    if (Number.isFinite(limit) && versions.length >= limit) {
      return NextResponse.json(
        { error: `You can keep ${limit} CV versions. Remove one before importing another.`, limit },
        { status: 409 },
      );
    }

    profile.jsonImports = [...versions, { label, content, at: new Date() }];
    await profile.save();

    return NextResponse.json({
      content,
      label,
      versions: profile.jsonImports.length,
      limit: Number.isFinite(limit) ? limit : null,
    });
  }

  return NextResponse.json({ error: "Unknown import source." }, { status: 400 });
}

/** DELETE — drop one stored JSON version. */
export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("versionId");
  if (!id) return NextResponse.json({ error: "Which version?" }, { status: 400 });

  await dbConnect();
  const profile = await CVProfile.findOne({ userId: auth.id });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = profile.jsonImports?.length ?? 0;
  profile.jsonImports = (profile.jsonImports ?? []).filter(
    (v: { _id?: unknown }) => String(v._id) !== id,
  );
  if (profile.jsonImports.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await profile.save();

  return NextResponse.json({ versions: profile.jsonImports.length });
}
