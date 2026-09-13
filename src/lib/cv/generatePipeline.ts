import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";
import { importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import { readPhotoDataUri } from "@/lib/cvFiles";
import { buildMergedCV } from "@/lib/cv/import/sources";
import {
  canExportPdf, canUseAppDocs, canUseCVFormat, canUseLebenslauf,
  isPremiumUser, isSuperAdmin,
} from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { CV_FORMATS, CV_VARIANTS, type CVContent, type CVFormat, type CVVariant } from "@/types/cv";

export const CONTENT_MAX = 200_000;

export type ProfileDoc = Record<string, unknown> & {
  content?: unknown;
  primary?: { profilePhoto?: string; cv?: string };
};

export type GenerationSpec = {
  docType: "cv" | "resume" | "cover-letter";
  format: CVFormat;
  variant: CVVariant;
  output: "docx" | "pdf";
  hasAppInfo: boolean;
};

export type GateResult = { ok: true } | { ok: false; status: number; error: string; upgrade?: boolean };

/**
 * Shared so a preview can never show a document the commit would refuse to build.
 */
export function checkGenerationGates(
  auth: { role?: Role; plan?: string; email?: string | null },
  spec: GenerationSpec,
): GateResult {
  if (spec.docType !== "cv" && !spec.hasAppInfo) {
    return { ok: false, status: 400, error: "Company and job title are required for this document." };
  }
  if (!CV_FORMATS.includes(spec.format)) {
    return { ok: false, status: 400, error: "Unknown CV format." };
  }
  if (!CV_VARIANTS.includes(spec.variant)) {
    return { ok: false, status: 400, error: "Unknown CV variant." };
  }
  if (spec.format === "lebenslauf" && !canUseLebenslauf(auth.role, auth.email)) {
    return { ok: false, status: 403, error: "The Lebenslauf format is not available on your account." };
  }
  if (spec.docType === "cv" && !canUseCVFormat(auth.role, auth.plan, spec.format, spec.variant)) {
    return { ok: false, status: 403, error: "That CV format is not available on your plan.", upgrade: true };
  }
  if (spec.output === "pdf" && !canExportPdf(auth.role, auth.plan)) {
    return {
      ok: false, status: 403, upgrade: true,
      error: "PDF export is a Premium feature. Your plan includes Word downloads.",
    };
  }
  if (spec.docType !== "cv" && !canUseAppDocs(auth.role, auth.plan)) {
    return { ok: false, status: 403, error: "Per-application documents are a Premium feature.", upgrade: true };
  }
  return { ok: true };
}

export type ResolvedContent =
  | { ok: true; content: CVContent; profile: ProfileDoc | null }
  | { ok: false; status: number; error: string };

/**
 * isContentEmpty only catches a *completely* blank profile, so a malformed override
 * like { name: "X" } produced a one-line document and a 200. A CV needs a name and
 * at least one section worth printing.
 */
export function isTooThinToPrint(c: CVContent) {
  const hasBody =
    Boolean(c.summary.trim()) ||
    c.experience.length > 0 ||
    c.education.length > 0 ||
    c.skills.length > 0 ||
    c.projects.length > 0;
  return !c.name.trim() || !hasBody;
}

/**
 * The one place generation content is assembled. Both the preview and the commit
 * call it, which is what stops the reviewed document and the downloaded one drifting.
 */
export async function resolveGenerationContent(
  auth: { id: string; role?: Role; plan?: string },
  body: { useSources?: boolean; content?: unknown },
): Promise<ResolvedContent> {
  await dbConnect();

  const profile = (await CVProfile.findOne(
    { userId: auth.id },
    { uploadedFiles: 0 },
  ).lean()) as ProfileDoc | null;

  let content = normaliseContent(profile?.content);
  if (isContentEmpty(content) && profile) content = importFromLegacy(profile as never);

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
      return {
        ok: false,
        status: 413,
        error: "That CV is too large to generate. Trim some detail and try again.",
      };
    }
    content = normaliseContent(body.content);
  }

  if (!content.photo && profile?.primary?.profilePhoto) {
    content = { ...content, photo: await readPhotoDataUri(auth.id, profile.primary.profilePhoto) };
  }

  if (isContentEmpty(content)) {
    return {
      ok: false,
      status: 400,
      error: "Your CV is empty. Add your details in the CV Builder first.",
    };
  }

  return { ok: true, content, profile };
}
