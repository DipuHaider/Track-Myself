import { runAiJsonTask, type Actor } from "@/lib/ai/gateway";
import { fence } from "@/lib/ai/prompt";
import { interviewQuestionsSchema } from "@/lib/ai/schemas";
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
${description ? fence("job_description", description) : "No job description was supplied."}

Write ${AI_TARGET} interview questions an interviewer would realistically ask for THIS role.
Favour specifics from the description over generic questions. No numbering, no preamble.

Return ONLY a JSON array, each element {"q":"...","s":"..."} where s is one of:
${QUESTION_SECTIONS.join(", ")}`;

  const run = await runAiJsonTask({
    task: "interview.questions",
    actor: opts.actor,
    prompt,
    maxOutputTokens: 2000,
    userKey: opts.userKey,
    schema: interviewQuestionsSchema,
    kind: "array",
    schemaHint: '[{"q": string, "s": string}]',
  });

  if (!run.ok) return [];

  return run.value
    .map((r) => ({
      text: r.q,
      section: (QUESTION_SECTIONS.includes(r.s as QuestionSection) ? r.s : "role") as QuestionSection,
    }))
    .slice(0, AI_TARGET);
}
