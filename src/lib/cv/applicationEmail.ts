import type { CVContent } from "@/types/cv";
import type { AppInfo } from "@/lib/cv/docx/coverLetter";
import { postingTerms } from "@/lib/ai/jobFit";
import { runAiJsonTask, type Actor } from "@/lib/ai/gateway";
import { fence } from "@/lib/ai/prompt";
import { applicationEmailSchema } from "@/lib/ai/schemas";
import { greetingFor, introPhrase, pickProjects, roleParts, sentence, yearsOfExperience } from "@/lib/cv/coverLetter";
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
  return [`Application for ${info.jobTitle}`, c.name].filter(Boolean).join(" – ");
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean));
}

function overlap(text: string, terms: Set<string>): number {
  let n = 0;
  for (const w of words(text)) if (terms.has(w)) n++;
  return n;
}

function list(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items.join("");
}

export function draftApplicationEmail(c: CVContent, info: AppInfo): ApplicationEmail {
  const posting = [info.jobDescription, info.notes].filter(Boolean).join("\n");
  const terms = new Set(postingTerms(posting));
  const skills = [...new Set(c.skills.flatMap((g) => g.items.split(",").map((s) => s.trim()).filter(Boolean)))];
  const matched = terms.size ? skills.filter((s) => [...words(s)].some((w) => terms.has(w))) : [];
  const shown = (matched.length ? matched : skills).slice(0, 4);

  const roles = c.experience.filter((e) => e.title || e.company).map((e) => ({ ...e, ...roleParts(e) }));
  const latest = roles[0];
  const best = terms.size
    ? [...roles].sort((a, b) => overlap(b.bullets.join(" "), terms) - overlap(a.bullets.join(" "), terms))[0]
    : latest;
  const bullet = best
    ? [...best.bullets].filter(Boolean).sort((a, b) => (terms.size ? overlap(b, terms) - overlap(a, terms) : 0)).map(sentence)[0]
    : "";

  const who = introPhrase(c, info.jobTitle);
  const intro = who ? `I am ${who}${latest?.company ? `, currently at ${latest.company}` : ""}.` : "";
  const proof = !bullet || !best
    ? ""
    : best === latest && latest.company
      ? ` There, I ${bullet}.`
      : ` At ${best.company || "a previous role"}, I ${bullet}.`;
  const stack = shown.length
    ? ` I work daily with ${list(shown)}${matched.length ? ", which is what your posting asks for" : ""}.`
    : "";
  const projects = pickProjects(c, posting, 3);
  const availability = c.availability.trim().replace(/[.\s]+$/, "");

  const blocks = [
    greetingFor(info),
    `I would like to apply for the ${info.jobTitle} position at ${info.companyName}` +
      (info.platform ? `, advertised on ${info.platform}` : "") +
      ". My CV and cover letter are attached.",
    `${intro}${proof}${stack}`.trim(),
    projects.length ? `Relevant work:\n${projects.map((p) => `- ${p}`).join("\n")}` : "",
    `I would welcome a short conversation about how I can help ${info.companyName}.` +
      (availability ? ` ${availability.charAt(0).toUpperCase()}${availability.slice(1)}.` : ""),
    `Kind regards,\n${signature(c)}`,
  ];
  return {
    subject: emailSubject(c, info),
    body: blocks.filter(Boolean).join("\n\n"),
  };
}

function cvForPrompt(c: CVContent): string {
  return [
    `Name: ${c.name}`,
    c.positioning && `Headline: ${c.positioning}`,
    yearsOfExperience(c) > 0 && `Years of experience: ${yearsOfExperience(c)}`,
    c.summary && `Summary: ${c.summary}`,
    c.skills.length && `Skills: ${c.skills.map((g) => `${g.label}: ${g.items}`).join(" | ")}`,
    ...c.experience.slice(0, 4).map((e) => {
      const r = roleParts(e);
      return `Role: ${r.title} at ${r.company} (${e.dates})\n${e.bullets.slice(0, 4).map((b) => `- ${b}`).join("\n")}`;
    }),
    (c.projects ?? []).length > 0 &&
      `Projects:\n${c.projects.slice(0, 10).map((p) => `- ${[p.name, p.stack && `(${p.stack})`, p.text].filter(Boolean).join(" ")}`).join("\n")}`,
    c.availability && `Availability: ${c.availability}`,
  ].filter(Boolean).join("\n").slice(0, 8000);
}

export function buildEmailPrompt(c: CVContent, info: AppInfo, correction = ""): string {
  const posting = [info.jobDescription, info.notes].filter(Boolean).join("\n").slice(0, 8000);
  return [
    "Write the email a candidate sends to apply for this job, with the CV and cover letter attached. Return only JSON:",
    '{"subject": "...", "body": "..."}',
    "",
    "Structure of the body (plain text, blank line between blocks):",
    `1. Greeting.`,
    `2. One or two sentences: applying for the role at the company${info.platform ? `, advertised on ${info.platform}` : ""}; CV and cover letter attached.`,
    "3. Two or three sentences: who the candidate is, one concrete achievement from the CV (with a number if the CV has one) that matches the posting, and the matching skills.",
    "4. Optional: \"Relevant work:\" followed by 2-3 lines starting with \"- \", each a CV project with its link or a few words on what it is. Omit the block if no CV project fits.",
    "5. One sentence inviting a conversation, plus availability if the CV gives it.",
    "6. Sign-off line, then the signature.",
    "",
    "Rules:",
    "- Subject: under 90 characters, in the form \"Application for <role> – <name>\", adding the reference number if the posting gives one.",
    "- 90-170 words before the signature. No markdown, no placeholders such as [Name].",
    "- Use only facts from the CV. Never invent employers, numbers, links, degrees or skills.",
    "- Introduce the candidate with the job title from the CV that best fits this posting and their years of experience. Do not copy the CV headline word for word.",
    "- A short, specific covering email; do not repeat the cover letter.",
    "- Avoid: \"I am writing to\", \"passionate\", \"proven track record\", \"dynamic team\", \"I am confident\", \"strong fit\".",
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
