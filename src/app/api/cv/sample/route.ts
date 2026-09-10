export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { importFromLegacy, isContentEmpty } from "@/lib/cv/content";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { PDF_MIME, cvPdfFileName, renderCVPdf } from "@/lib/cv/pdf";
import type { CVFormat, CVVariant } from "@/types/cv";

const PUBLIC_FORMATS: CVFormat[] = ["ats", "europass", "designer"];
const FIELD_MAX = 6000;
const TOTAL_MAX = 24000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const FIELDS = [
  "name", "title", "email", "phone", "location", "linkedin",
  "website", "summary", "experience", "education", "skills", "languages",
] as const;

export async function POST(req: Request) {
  const gate = checkRateLimit({
    key: `cv-sample:${clientIp(req)}`,
    limit: MAX_PER_WINDOW,
    windowMs: WINDOW_MS,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many downloads from this address. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
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

  /* The public builder is PDF-only. Word export is what an account is for. */
  const buffer = await renderCVPdf(content, format, variant);
  const filename = cvPdfFileName(content, format, variant);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": PDF_MIME,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
