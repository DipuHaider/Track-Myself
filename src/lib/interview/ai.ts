import { runAiTask, type Actor } from "@/lib/ai/gateway";
import type { AICredential } from "@/lib/cv/ai/provider";
import { QUESTION_SECTIONS, type QuestionSection } from "@/lib/interview/bank";

export const AI_TARGET = 22;

type Extra = { text: string; section: QuestionSection };

/* Best-effort: a failure here just means the paper is pure bank, never an error
   in the user's face. Returns [] when no provider is available to this role. */
export async function aiQuestions(opts: {
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  actor: Actor;
  userKey?: AICredential | null;
}): Promise<Extra[]> {
  const description = (opts.jobDescription ?? "").slice(0, 4000);

  const prompt = `You are preparing a candidate for a job interview.

Role: ${opts.jobTitle}
Company: ${opts.companyName}
${description ? `Job description:\n${description}` : "No job description was supplied."}

Write ${AI_TARGET} interview questions an interviewer would realistically ask for THIS role.
Favour specifics from the description over generic questions. No numbering, no preamble.

Return ONLY a JSON array, each element {"q":"...","s":"..."} where s is one of:
${QUESTION_SECTIONS.join(", ")}`;

  const run = await runAiTask({
    task: "interview.questions",
    actor: opts.actor,
    prompt,
    maxOutputTokens: 2000,
    userKey: opts.userKey,
  });

  if (run.ok) {
    const match = run.text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as { q?: unknown; s?: unknown }[];
        const rows = parsed
          .filter((r) => typeof r?.q === "string" && (r.q as string).trim().length > 10)
          .map((r) => ({
            text: (r.q as string).trim().slice(0, 300),
            section: (QUESTION_SECTIONS.includes(r.s as QuestionSection)
              ? r.s
              : "role") as QuestionSection,
          }));
        if (rows.length) return rows.slice(0, AI_TARGET);
      } catch {
        /* Fall through to the static bank. */
      }
    }
  }

  return [];
}
