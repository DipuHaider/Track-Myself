import type { CVContent } from "@/types/cv";
import type { AppInfo } from "@/lib/cv/docx/coverLetter";
import { postingTerms } from "@/lib/ai/jobFit";
import { runAiJsonTask, type Actor } from "@/lib/ai/gateway";
import { fence } from "@/lib/ai/prompt";
import { applicationEmailSchema } from "@/lib/ai/schemas";
import { greetingFor, roleParts } from "@/lib/cv/coverLetter";
import type { AICredential } from "@/lib/cv/ai/provider";

export type ApplicationEmail = { subject: string; body: string };

const MAX_SUBJECT = 200;
const MAX_BODY = 4000;

export function signature(c: CVContent): string {
  return [c.name, c.contact.phone, c.contact.email, c.contact.linkedin].filter(Boolean).join("\n");
}

export function sanitizeEmail(input: unknown, c: CVContent): ApplicationEmail | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { subject?: unknown; body?: unknown };
  const subject = typeof raw.subject === "string" ? raw.subject.replace(/\s+/g, " ").trim().slice(0, MAX_SUBJECT) : "";
  let body = typeof raw.body === "string"
    ? raw.body.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
    : "";
  if (!subject || !body) return null;
  const sig = signature(c);
  if (c.name && !body.includes(c.name)) body = `${body}\n${sig}`;
  return { subject, body: body.slice(0, MAX_BODY) };
}

export function emailSubject(c: CVContent, info: AppInfo): string {
  return [`Application: ${info.jobTitle}`, c.name].filter(Boolean).join(" – ");
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean));
}

export function draftApplicationEmail(c: CVContent, info: AppInfo): ApplicationEmail {
  const terms = new Set(postingTerms([info.jobDescription, info.notes].filter(Boolean).join("\n")));
  const skills = [...new Set(c.skills.flatMap((g) => g.items.split(",").map((s) => s.trim()).filter(Boolean)))];
  const matched = terms.size ? skills.filter((s) => [...words(s)].some((w) => terms.has(w))) : [];
  const shown = (matched.length ? matched : skills).slice(0, 4);

  const latest = c.experience.find((e) => e.title || e.company);
  const role = latest ? roleParts(latest) : null;
  const who = c.positioning || role?.title || c.gradeTitle || "";
  const intro = who
    ? `I am ${/^[aeiou]/i.test(who) ? "an" : "a"} ${who}${role?.company ? ` at ${role.company}` : ""}`
    : "";

  const lines = [
    greetingFor(info),
    "",
    `I would like to apply for the ${info.jobTitle} position at ${info.companyName}` +
      (info.platform ? `, which I found on ${info.platform}` : "") + ".",
    "",
    [
      intro && `${intro}.`,
      shown.length && `My work centres on ${shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0]}` +
        (matched.length ? ", which matches what your posting asks for." : "."),
    ].filter(Boolean).join(" "),
    "",
    "Please find my CV and cover letter attached. I would be glad to talk about how I can contribute to your team.",
    c.availability.trim() ? `\n${c.availability.trim().replace(/[.\s]+$/, "")}.` : "",
    "",
    "Kind regards,",
    signature(c),
  ];
  return {
    subject: emailSubject(c, info),
    body: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

function cvForPrompt(c: CVContent): string {
  return [
    `Name: ${c.name}`,
    c.positioning && `Positioning: ${c.positioning}`,
    c.summary && `Summary: ${c.summary}`,
    c.skills.length && `Skills: ${c.skills.map((g) => `${g.label}: ${g.items}`).join(" | ")}`,
    ...c.experience.slice(0, 4).map((e) => {
      const r = roleParts(e);
      return `Role: ${r.title} at ${r.company} (${e.dates})\n${e.bullets.slice(0, 4).map((b) => `- ${b}`).join("\n")}`;
    }),
    c.availability && `Availability: ${c.availability}`,
  ].filter(Boolean).join("\n").slice(0, 7000);
}

export function buildEmailPrompt(c: CVContent, info: AppInfo, correction = ""): string {
  const posting = [info.jobDescription, info.notes].filter(Boolean).join("\n").slice(0, 8000);
  return [
    "Write the email a candidate sends to apply for this job, with the CV and cover letter attached. Return only JSON:",
    '{"subject": "...", "body": "..."}',
    "",
    "Rules:",
    "- Subject: under 90 characters, names the role (and the reference number if the posting gives one) and the candidate's name.",
    "- Body: plain text with blank lines between paragraphs, 90-170 words before the signature. No markdown, no placeholders such as [Name].",
    "- Open with the role and company, then one or two concrete CV facts that match what the posting asks for, then mention the attached CV and cover letter and invite a conversation.",
    "- Use only facts from the CV. Never invent employers, numbers, degrees or skills.",
    "- Do not repeat the cover letter; this is a short, specific covering email.",
    "- Write in the same language as the job posting.",
    `- Greeting: ${info.contactName ? `address ${info.contactName} by name` : "\"Dear Hiring Manager,\" (or the posting's language equivalent)"}.`,
    `- End with a sign-off line, then this signature exactly:\n${signature(c)}`,
    correction ? `- The candidate asked for these changes:\n${fence("correction", correction.slice(0, 2000))}` : "",
    "",
    `Company: ${info.companyName}`,
    `Role: ${info.jobTitle}`,
    info.location ? `Location: ${info.location}` : "",
    info.platform ? `Found on: ${info.platform}` : "",
    "",
    fence("job_posting", posting || "(no posting text — write from the role title and the CV)"),
    "",
    fence("cv", cvForPrompt(c)),
  ].filter((l) => l !== "").join("\n");
}

export async function writeApplicationEmail(opts: {
  content: CVContent;
  info: AppInfo;
  actor: Actor;
  userKey?: AICredential | null;
  correction?: string;
  useAi: boolean;
}): Promise<{ email: ApplicationEmail; mode: "ai" | "heuristic"; note: string }> {
  const fallback = draftApplicationEmail(opts.content, opts.info);
  if (!opts.useAi) {
    return { email: fallback, mode: "heuristic", note: "Drafted from your CV and the posting's keywords." };
  }

  const run = await runAiJsonTask({
    task: "application.email",
    actor: opts.actor,
    prompt: buildEmailPrompt(opts.content, opts.info, opts.correction),
    maxOutputTokens: 900,
    userKey: opts.userKey,
    schema: applicationEmailSchema,
    kind: "object",
    schemaHint: '{"subject": string, "body": string}',
  });

  if (!run.ok) {
    return { email: fallback, mode: "heuristic", note: `${run.message} Showing a keyword-based draft instead.` };
  }
  return {
    email: sanitizeEmail(run.value, opts.content) ?? fallback,
    mode: "ai",
    note: `${run.meta.providerLabel} wrote this email for ${opts.info.companyName}.`,
  };
}
