import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import JobLead from "@/models/JobLead";
import { PLATFORMS, DEFAULT_APPLICATION_STATUS } from "@/constants/applicationStatus";
import { historyActor, initialHistory } from "@/lib/applicationHistory";
import { aiEntitlement, type Actor } from "@/lib/ai/gateway";
import { getUserCredential } from "@/lib/ai/userKey";
import { analyseJobFit, keywordGaps, type GapAnalysis } from "@/lib/ai/jobFit";
import { isTooThinToPrint, resolveGenerationContent } from "@/lib/cv/generatePipeline";
import { applyTailorOutput, runTailor } from "@/lib/cv/ai/adapt";
import { draftHash, findDraft, saveDraft } from "@/lib/cv/draftCache";
import { writeCoverLetter, type CoverLetterText } from "@/lib/cv/coverLetter";
import { tailorToApplication } from "@/lib/cv/import/merge";
import { jobDescriptionFrom } from "@/lib/cv/jobDescription";
import { generatedFileName } from "@/lib/cv/fileName";
import { saveGeneratedFile } from "@/lib/cv/saveGenerated";
import { renderCoverLetterDocx, renderTailoredResumeDocx, type AppInfo } from "@/lib/cv/docx";
import { renderCoverLetterPdf, renderTailoredResumePdf } from "@/lib/cv/pdf";
import { canExportPdf, type Plan, type Role } from "@/lib/permissions";
import type { CVContent } from "@/types/cv";
import { emitLeadReady } from "@/lib/jobs/events";

export type PrepareUser = { id: string; role: Role; plan: Plan; status: "active" | "paused"; email?: string | null };

export type PrepareResult =
  | { ok: true; leadId: string; applicationId: string; fileIds: string[]; notes: string[] }
  | { ok: false; leadId: string; error: string };

type LeadDoc = {
  _id: { toString(): string };
  userId: { toString(): string };
  status: string;
  company: string;
  title: string;
  platform?: string;
  location?: string;
  city?: string;
  country?: string;
  url?: string;
  applyUrl?: string;
  otherUrls?: string[];
  description?: string;
  salary?: string;
  postedAt?: Date | null;
  postedAgeText?: string;
  deadline?: Date | null;
  source: string;
  applicationId?: { toString(): string } | null;
  fitGaps?: { requirement?: string; question?: string; answer?: string }[];
};

const PREPARABLE = new Set(["new", "shortlisted", "ready", "failed", "preparing"]);
const TAILOR_RATE = { limit: 30, windowMs: 60 * 60 * 1000 };
const FORMAT = "ats";
const VARIANT = "full";

function appInfoFor(lead: LeadDoc): AppInfo {
  return {
    companyName: lead.company,
    jobTitle: lead.title,
    location: lead.location,
    jobPostUrl: lead.applyUrl || lead.url,
    platform: lead.platform,
    jobDescription: lead.description,
  };
}

/* Answers to gap questions are passed to the tailor as clarifications the
   candidate made about their own experience. They are the user's words, so
   the model may use them, but the prompt still forbids inventing anything. */
export function correctionFromAnswers(gaps: LeadDoc["fitGaps"]): string {
  const lines = (gaps ?? [])
    .filter((g) => g.answer && g.answer.trim())
    .map((g) => `- ${g.requirement ?? g.question}: ${g.answer!.trim()}`);
  return lines.length ? `The candidate clarified their experience:\n${lines.join("\n")}` : "";
}

async function ensureApplication(lead: LeadDoc, userId: string): Promise<string> {
  if (lead.applicationId) {
    const exists = await Application.exists({ _id: lead.applicationId, userId });
    if (exists) return lead.applicationId.toString();
  }
  const platform = (PLATFORMS as readonly string[]).includes(lead.platform ?? "") ? lead.platform : "Other";
  const jobPostUrl = lead.applyUrl || lead.url || "";
  const extra = [lead.url, ...(lead.otherUrls ?? [])].filter((u): u is string => Boolean(u) && u !== jobPostUrl).slice(0, 4);
  const app = await Application.create({
    userId,
    companyName: lead.company,
    jobTitle: lead.title,
    platform,
    platformDetail: platform === "Other" ? (lead.source === "ba" ? "Bundesagentur für Arbeit" : lead.source) : undefined,
    location: lead.location || undefined,
    city: lead.city || undefined,
    country: lead.country || undefined,
    salary: lead.salary || undefined,
    jobPostUrl,
    additionalJobPostUrls: extra.length ? extra : undefined,
    jobDescription: lead.description?.slice(0, 24000) || undefined,
    postedAt: lead.postedAt ?? null,
    postedAgeText: lead.postedAgeText ?? "",
    postingObservedAt: lead.postedAt ? new Date() : null,
    deadline: lead.deadline ?? null,
    leadId: lead._id,
    notes: "Found by Job hunt.",
    applicationStatus: DEFAULT_APPLICATION_STATUS,
    statusHistory: initialHistory(DEFAULT_APPLICATION_STATUS, await historyActor(userId)),
  });
  return String(app._id);
}

async function tailorCv(
  baseline: CVContent, lead: LeadDoc, actor: Actor, user: PrepareUser,
  userKey: Awaited<ReturnType<typeof getUserCredential>>, correction: string,
): Promise<{ content: CVContent; mode: string; changedFields: string[]; note: string }> {
  const info = appInfoFor(lead);
  const jd = jobDescriptionFrom(info);
  const ent = await aiEntitlement(actor, "cv.preview", userKey);
  if (!ent.allowed || !jd.trim()) {
    return {
      content: tailorToApplication(baseline, { ...info }),
      mode: "heuristic",
      changedFields: [],
      note: ent.allowed ? "No job description to tailor against; reordered only." : `${ent.message} Reordered to match the job, not rewritten.`,
    };
  }
  const hash = draftHash({ userId: user.id, docType: "resume", format: FORMAT, variant: VARIANT, jobDescription: jd, correction, baseline });
  const cached = await findDraft(user.id, hash);
  if (cached) return { content: cached, mode: "ai", changedFields: [], note: "Reused the tailored CV already generated for this job." };

  const result = await runTailor(baseline, jd, { task: "cv.preview", actor, correction, userKey, rate: TAILOR_RATE });
  if (!result.ok) {
    return {
      content: tailorToApplication(baseline, { ...info }),
      mode: "heuristic",
      changedFields: [],
      note: `${result.error} Reordered to match the job instead.`,
    };
  }
  const applied = applyTailorOutput(baseline, result.value);
  await saveDraft(user.id, hash, `resume-${FORMAT}-${VARIANT}`, applied.content);
  return {
    content: applied.content,
    mode: "ai",
    changedFields: applied.changedFields,
    note: applied.changedFields.length ? `${result.providerLabel} rewrote: ${applied.changedFields.join(", ")}.` : `${result.providerLabel} kept your CV as it was.`,
  };
}

async function gapsFor(
  cv: CVContent, lead: LeadDoc, actor: Actor, userKey: Awaited<ReturnType<typeof getUserCredential>>,
): Promise<GapAnalysis> {
  const jd = lead.description ?? "";
  if (!jd.trim()) return { mode: "keyword", items: [], note: "No job description." };
  /* Free accounts get 10 shared AI uses a month; a three-call prepare would
     spend them fast, so their gap check stays on word matching. */
  const ent = await aiEntitlement(actor, "cv.gap-analysis", userKey);
  if (ent.allowed && ent.via !== "allowance") return analyseJobFit({ cv, jobDescription: jd, actor, userKey });
  return keywordGaps(cv, jd);
}

export async function renderLeadLetter(opts: {
  user: PrepareUser;
  lead: LeadDoc;
  content: CVContent;
  letter: CoverLetterText;
  applicationId: string;
  note: string;
}): Promise<string | null> {
  const info = appInfoFor(opts.lead);
  const output = canExportPdf(opts.user.role, opts.user.plan) ? "pdf" : "docx";
  const buffer = output === "pdf"
    ? await renderCoverLetterPdf(opts.content, info, opts.letter)
    : await renderCoverLetterDocx(opts.content, info, opts.letter);
  const naming = generatedFileName({ content: opts.content, info, docType: "cover-letter", format: FORMAT, variant: VARIANT, output });
  return saveGeneratedFile({
    userId: opts.user.id,
    buffer,
    filename: naming.name,
    format: FORMAT,
    variant: VARIANT,
    docType: "cover-letter",
    genFor: `${info.companyName} — ${info.jobTitle}`,
    isoDate: naming.isoDate,
    snapshot: JSON.stringify({ ...opts.content, photo: "", coverLetter: opts.letter }),
    genTailor: "job-hunt",
    genNote: opts.note,
    applicationId: opts.applicationId,
  });
}

/* The whole preparation for one lead: an application in the tracker, a CV
   tailored to the posting, a cover letter, a gap check, and both documents in
   My Docs linked to that application. Every AI step goes through the gateway
   with the user's own entitlement and falls back to its non-AI mode, so a
   spent allowance degrades the result rather than failing it. */
export async function prepareLead(
  leadId: string,
  user: PrepareUser,
  opts: { correction?: string; letterOnly?: CoverLetterText } = {},
): Promise<PrepareResult> {
  await dbConnect();
  const lead = (await JobLead.findOne({ _id: leadId, userId: user.id }).lean()) as LeadDoc | null;
  if (!lead) return { ok: false, leadId, error: "Not found" };
  if (!PREPARABLE.has(lead.status)) return { ok: false, leadId, error: `A ${lead.status} lead cannot be prepared.` };
  if (user.status === "paused") return { ok: false, leadId, error: "Your account is paused." };

  await JobLead.updateOne({ _id: leadId }, { $set: { status: "preparing", error: "", statusChangedAt: new Date() } });

  try {
    const resolved = await resolveGenerationContent({ id: user.id, role: user.role, plan: user.plan }, {});
    if (!resolved.ok) throw new Error(resolved.error);
    const baseline = resolved.content;

    const applicationId = await ensureApplication(lead, user.id);
    const actor: Actor = { kind: "user", id: user.id, role: user.role, plan: user.plan, status: user.status, email: user.email ?? undefined };
    const userKey = await getUserCredential(user.id);
    const correction = (opts.correction ?? correctionFromAnswers(lead.fitGaps)).slice(0, 2000);
    const info = appInfoFor(lead);
    const output = canExportPdf(user.role, user.plan) ? "pdf" : "docx";
    const notes: string[] = [];

    const tailored = await tailorCv(baseline, lead, actor, user, userKey, correction);
    notes.push(tailored.note);
    if (isTooThinToPrint(tailored.content)) throw new Error("Your CV is too thin to print. Add experience or skills in the CV Builder.");

    const resumeBuffer = output === "pdf"
      ? await renderTailoredResumePdf(tailored.content, info, VARIANT)
      : await renderTailoredResumeDocx(tailored.content, info, VARIANT);
    const resumeName = generatedFileName({ content: tailored.content, info, docType: "resume", format: FORMAT, variant: VARIANT, output });
    const resumeId = await saveGeneratedFile({
      userId: user.id,
      buffer: resumeBuffer,
      filename: resumeName.name,
      format: FORMAT,
      variant: VARIANT,
      docType: "resume",
      genFor: `${info.companyName} — ${info.jobTitle}`,
      isoDate: resumeName.isoDate,
      snapshot: JSON.stringify({ ...tailored.content, photo: "" }),
      genTailor: tailored.mode,
      genNote: tailored.note,
      applicationId,
    });

    let letter: CoverLetterText | null = opts.letterOnly ?? null;
    let letterMode = letter ? "edited" : "";
    if (!opts.letterOnly) {
      const ent = await aiEntitlement(actor, "cover-letter.write", userKey);
      const written = await writeCoverLetter({ content: tailored.content, info, actor, userKey, correction, useAi: ent.allowed });
      letter = written.letter;
      letterMode = written.mode;
      notes.push(ent.allowed ? written.note : `${ent.message} The letter is drafted from your CV instead.`);
    }
    const letterId = await renderLeadLetter({ user, lead, content: tailored.content, letter: letter!, applicationId, note: notes.join(" ") });

    const gaps = await gapsFor(tailored.content, lead, actor, userKey);
    const previousAnswers = new Map((lead.fitGaps ?? []).map((g) => [(g.requirement ?? "").toLowerCase(), g.answer ?? ""]));

    const fileIds = [resumeId, letterId].filter((x): x is string => Boolean(x));
    await JobLead.updateOne(
      { _id: leadId },
      {
        $set: {
          status: "ready",
          statusChangedAt: new Date(),
          applicationId,
          cvFileIds: fileIds,
          fitMode: gaps.mode,
          fitGaps: gaps.items
            .filter((g) => g.verdict !== "match")
            .slice(0, 8)
            .map((g) => ({
              requirement: g.requirement.slice(0, 300),
              level: g.level,
              verdict: g.verdict,
              question: g.question.slice(0, 300),
              answer: previousAnswers.get(g.requirement.toLowerCase()) ?? "",
            })),
          prepared: {
            tailorMode: tailored.mode,
            letterMode,
            changedFields: tailored.changedFields,
            note: notes.filter(Boolean).join(" ").slice(0, 1000),
            letter,
            format: FORMAT,
            output,
            at: new Date(),
          },
          error: "",
        },
      },
    );
    if (!opts.letterOnly) {
      await emitLeadReady(user.id, { id: leadId, company: lead.company, title: lead.title, applicationId }).catch(() => undefined);
    }
    return { ok: true, leadId, applicationId, fileIds, notes };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preparation failed.";
    await JobLead.updateOne({ _id: leadId }, { $set: { status: "failed", error: message.slice(0, 500), statusChangedAt: new Date() } });
    return { ok: false, leadId, error: message };
  }
}
