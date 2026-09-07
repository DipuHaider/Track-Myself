export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { importFromLegacy, isContentEmpty } from "@/lib/cv/content";
import { DOCX_MIME, cvFileName, renderCVDocx } from "@/lib/cv/docx";
import type { CVFormat, CVVariant } from "@/types/cv";

const PUBLIC_FORMATS: CVFormat[] = ["ats", "europass", "designer"];
const FIELD_MAX = 6000;
const TOTAL_MAX = 24000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

function clientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "anonymous";
}

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

const FIELDS = [
  "name", "title", "email", "phone", "location", "linkedin",
  "website", "summary", "experience", "education", "skills", "languages",
] as const;

export async function POST(req: Request) {
  if (rateLimited(clientKey(req))) {
    return NextResponse.json(
      { error: "Too many downloads from this address. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const format = (body.format ?? "ats") as CVFormat;
  const variant = (body.variant ?? "full") as CVVariant;

  if (!PUBLIC_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Unknown CV format." }, { status: 400 });
  }
  if (variant !== "full" && variant !== "compact") {
    return NextResponse.json({ error: "Unknown CV variant." }, { status: 400 });
  }

  const flat: Record<string, string> = {};
  let total = 0;
  for (const key of FIELDS) {
    const value = typeof body[key] === "string" ? body[key].slice(0, FIELD_MAX) : "";
    total += value.length;
    flat[key] = value;
  }
  if (total > TOTAL_MAX) {
    return NextResponse.json(
      { error: "That CV is too long for the free builder. Sign up to build a full CV." },
      { status: 400 },
    );
  }

  const content = importFromLegacy(flat);
  if (isContentEmpty(content)) {
    return NextResponse.json({ error: "Add your name and some details first." }, { status: 400 });
  }

  const buffer = await renderCVDocx(content, format, variant);
  const filename = cvFileName(content, format, variant);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
