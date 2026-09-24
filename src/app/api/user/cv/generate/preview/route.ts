export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import CVFile from "@/models/CVFile";
import { getUserCredential } from "@/lib/ai/userKey";
import { aiAvailableFor, sharedProviderStatus, type Actor } from "@/lib/ai/gateway";
import { isPremiumUser, isSuperAdmin } from "@/lib/permissions";
import {
  checkGenerationGates, isTooThinToPrint, resolveGenerationContent,
} from "@/lib/cv/generatePipeline";
import { CORRECTION_MAX, JD_MAX, applyTailorOutput, runTailor } from "@/lib/cv/ai/adapt";
import { draftHash, findDraft, saveDraft } from "@/lib/cv/draftCache";
import { tailorToApplication } from "@/lib/cv/import/merge";
import { textForFile } from "@/lib/cv/import/sources";
import { contentToSections } from "@/lib/cv/diff/contentText";
import { diffDocuments, diffSectionMaps } from "@/lib/cv/diff/sectionDiff";
import { appDocFileName, cvFileName, type AppInfo } from "@/lib/cv/docx";
import { cvPdfFileName } from "@/lib/cv/pdf";
import type { CVFormat, CVVariant } from "@/types/cv";

/* Every regenerate is a model call, so this is tighter than the CV Builder's own
   20/hour bucket — and separate, so a review loop cannot starve it. */
const TAILOR_LIMIT = 10;
const TAILOR_WINDOW_MS = 60 * 60 * 1000;

type FileDoc = {
  _id: unknown; name: string; mimeType: string; data: string;
  category: string; parsedText?: string;
};

function jobDescriptionFrom(info: AppInfo): string {
  return [
    info.jobDescription,
    info.jobTitle,
    info.companyName,
    info.location,
    info.platform,
    info.jobPostUrl,
    info.notes,
  ].filter(Boolean).join("\n").slice(0, JD_MAX);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const format = (body.format ?? "ats") as CVFormat;
  const variant = (body.variant ?? "full") as CVVariant;
  const docType = (body.docType ?? "cv") as "cv" | "resume" | "cover-letter";
  const output = body.output === "pdf" ? "pdf" : "docx";
  const appInfo = body.appInfo as AppInfo | undefined;
  const correction = String(body.correction ?? "").slice(0, CORRECTION_MAX);
  const previousSummary = String(body.previousSummary ?? "");

  const gate = checkGenerationGates(auth, {
    docType, format, variant, output, hasAppInfo: Boolean(appInfo?.companyName),
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error, upgrade: gate.upgrade }, { status: gate.status });
  }

  const resolved = await resolveGenerationContent(auth, body);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const baseline = resolved.content;
  const spec = { docType, format, variant } as const;

  let tailored = baseline;
  let tailorMode: "ai" | "heuristic" | "none" = "none";
  let tailorNote = "";
  let upgrade = false;
  let providerLabel = "";
  let changedFields: string[] = [];
  let reused = false;

  const superadmin = isSuperAdmin(auth.role);
  const userKey = await getUserCredential(auth.id);
  const premium = superadmin || isPremiumUser(auth.role, auth.plan);
  const actor: Actor = { kind: "user", id: auth.id, role: auth.role, plan: auth.plan };
  const jobDescription = appInfo ? jobDescriptionFrom(appInfo) : "";

  if (!appInfo || !jobDescription.trim()) {
    tailorNote = "Nothing to tailor against — this is your CV as it stands.";
  } else if (!premium) {
    tailored = tailorToApplication(baseline, { ...appInfo });
    tailorMode = "heuristic";
    upgrade = true;
    tailorNote =
      "Free plan: your CV is reordered to match this job, not rewritten. Upgrade to Premium for AI tailoring.";
  } else if (!(await aiAvailableFor(actor, userKey))) {
    tailored = tailorToApplication(baseline, { ...appInfo });
    tailorMode = "heuristic";
    tailorNote = (sharedProviderStatus().anthropic || Boolean(userKey))
      ? "No AI provider is available for your account — showing the reorder-only version."
      : "AI tailoring is not configured on this deployment — showing the reorder-only version.";
  } else {
    {
      const hash = draftHash({
        userId: auth.id, docType, format, variant, jobDescription, correction, baseline,
      });

      /* A draft the user already paid for. Reopening the modal, or reloading
         after closing it, used to start a fresh billed call for an identical
         request — the accepted draft only ever lived in React state. */
      const cached = await findDraft(auth.id, hash);
      if (cached) {
        /* The stored draft is already the tailored result, so there is nothing
           to apply. changedFields describes what this run rewrote and no run
           happened, so it stays empty and the note says why. */
        tailored = cached;
        tailorMode = "ai";
        tailorNote = "Reusing the tailored version already generated for this job.";
        reused = true;
      }

      const result = reused
        ? null
        : await runTailor(baseline, jobDescription, {
            task: "cv.preview",
            actor,
            correction, previousSummary, userKey,
            rate: { limit: TAILOR_LIMIT, windowMs: TAILOR_WINDOW_MS },
          });

      if (result?.ok) {
        const applied = applyTailorOutput(baseline, result.value);
        tailored = applied.content;
        changedFields = applied.changedFields;
        tailorMode = "ai";
        providerLabel = result.providerLabel;
        tailorNote = changedFields.length
          ? `${result.providerLabel} rewrote: ${changedFields.join(", ")}.`
          : `${result.providerLabel} returned no changes for this role.`;
        await saveDraft(auth.id, hash, `${docType}-${format}-${variant}`, tailored);
      } else if (result) {
        tailored = tailorToApplication(baseline, { ...appInfo });
        tailorMode = "heuristic";
        /* The gateway distinguishes a rate limit from an exhausted allowance
           from an upstream failure, and its wording is more useful than a
           single catch-all sentence. */
        tailorNote = `${result.error} Showing the reorder-only version.`;
      }
    }
  }

  if (isTooThinToPrint(tailored)) {
    return NextResponse.json(
      { error: "There is not enough here to build a CV. Add your name and at least one section — summary, experience, education or skills." },
      { status: 400 },
    );
  }

  /* Left side: the starred Main CV as the user actually has it. Falls back to the
     merged builder content, because primary.cv is empty on plenty of accounts. */
  const right = contentToSections(tailored, spec);
  const mainCvId = String(resolved.profile?.primary?.cv ?? "");
  let leftSource = {
    kind: "builder" as "main-cv-file" | "builder",
    name: "CV Builder content",
    note: "No Main CV starred — comparing against your CV Builder content instead.",
  };
  let diff = diffSectionMaps(contentToSections(baseline, spec), right);

  if (mainCvId) {
    const file = (await CVFile.findOne(
      { _id: mainCvId, userId: auth.id },
      "name mimeType data category parsedText",
    ).lean()) as FileDoc | null;

    const got = file ? await textForFile(file) : null;
    if (got?.text.trim()) {
      diff = diffDocuments(got.text, right);
      leftSource = { kind: "main-cv-file", name: file!.name, note: "" };
    } else if (file) {
      leftSource = {
        kind: "builder",
        name: "CV Builder content",
        note: `Your Main CV (${file.name}) could not be read, so this compares against your CV Builder content.`,
      };
    }
  }

  const isoDate = new Date().toISOString().slice(0, 10);
  const filename = (docType === "cv"
    ? (output === "pdf" ? cvPdfFileName(tailored, format, variant) : cvFileName(tailored, format, variant))
    : appDocFileName(tailored, appInfo!, docType)
  ).replace(/\.(docx|pdf)$/, output === "pdf" ? ".pdf" : ".docx");

  return NextResponse.json({
    reused,
    tailoredContent: tailored,
    diff,
    leftSource,
    filename,
    isoDate,
    tailorMode,
    tailorNote,
    providerLabel,
    changedFields,
    upgrade,
  });
}
