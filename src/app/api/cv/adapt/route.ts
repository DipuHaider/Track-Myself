export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requirePremiumAuth } from "@/lib/serverAuth";
import { normaliseContent } from "@/lib/cv/content";
import { checkRateLimit } from "@/lib/rateLimit";
import type { CVSkillGroup } from "@/types/cv";

const MODEL = "claude-sonnet-5";
const JD_MAX = 24_000;

/* Every call costs money, so this is capped per account rather than per IP. */
const ADAPT_LIMIT = 20;
const ADAPT_WINDOW_MS = 60 * 60 * 1000;

/**
 * The feature promises reordering, not rewriting: "It never rewrites your roles or
 * bullet points." Nothing stops the model returning invented labels or dropping
 * skills, and the client saves the result immediately — so reconcile here. Only the
 * order can come from the model; the groups and their contents come from the user.
 */
function reconcileSkills(original: CVSkillGroup[], proposed: { label: string; items: string }[]): CVSkillGroup[] {
  const key = (s: string) => s.trim().toLowerCase();
  const byLabel = new Map(original.map((g) => [key(g.label), g]));
  const out: CVSkillGroup[] = [];
  const used = new Set<string>();

  for (const group of proposed) {
    const match = byLabel.get(key(group.label));
    if (!match || used.has(key(group.label))) continue;
    used.add(key(group.label));

    const originalItems = match.items.split(",").map((i) => i.trim()).filter(Boolean);
    const proposedItems = group.items.split(",").map((i) => i.trim()).filter(Boolean);

    const ordered = proposedItems.filter((i) =>
      originalItems.some((o) => o.toLowerCase() === i.toLowerCase()),
    );
    const dropped = originalItems.filter((o) =>
      !ordered.some((i) => i.toLowerCase() === o.toLowerCase()),
    );

    out.push({ ...match, items: [...ordered, ...dropped].join(", ") });
  }

  for (const group of original) {
    if (!used.has(key(group.label))) out.push(group);
  }

  return out;
}

export async function POST(req: Request) {
  const auth = await requirePremiumAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = checkRateLimit({
    key: `cv-adapt:${auth.id}`,
    limit: ADAPT_LIMIT,
    windowMs: ADAPT_WINDOW_MS,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "You have used all your AI tailoring runs for this hour. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const jobDescription = String(body.jobDescription ?? "");
  const content = normaliseContent(body.content ?? body.cvData);

  if (!jobDescription.trim()) {
    return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  }
  if (jobDescription.length > JD_MAX) {
    return NextResponse.json(
      { error: `That job description is ${jobDescription.length.toLocaleString()} characters. Paste the role and requirements only — up to ${JD_MAX.toLocaleString()}.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  const experienceText = content.experience
    .map((job) => {
      const header = [job.title, job.company, job.dates].filter(Boolean).join(" · ");
      return [header, ...job.bullets.map((b) => `- ${b}`)].join("\n");
    })
    .join("\n\n");

  const skillsText = content.skills.map((g) => `${g.label}: ${g.items}`).join("\n");

  const prompt = `You are an expert CV writer. Tailor the candidate's CV to the job description below.
Keep every fact accurate — reframe and reorder existing information only. Do not invent experience.

CANDIDATE CV
Name: ${content.name || "N/A"}
Positioning: ${content.positioning || "N/A"}
Summary: ${content.summary || "N/A"}

Experience:
${experienceText || "N/A"}

Skill groups:
${skillsText || "N/A"}

Education: ${content.education.map((e) => `${e.degree}, ${e.school} (${e.dates})`).join("; ") || "N/A"}
Languages: ${content.languages.map((l) => `${l.name} (${l.level})`).join(", ") || "N/A"}

JOB DESCRIPTION
${jobDescription.trim()}

Return ONLY a valid JSON object with these keys, no markdown and no explanation:
{
  "positioning": "job-aligned professional title, 2-5 words",
  "summary": "tailored 3-5 sentence summary highlighting fit for this role",
  "summaryShort": "the same positioning compressed to two sentences",
  "skills": [{ "label": "existing group label", "items": "same skills, most relevant to this job first" }]
}
The "skills" array must contain exactly the same group labels as the input, reordered so the group most
relevant to this job comes first, and with the items inside each group reordered the same way.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic error:", err);
      return NextResponse.json({ error: "AI request failed." }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response." }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      positioning?: string;
      summary?: string;
      summaryShort?: string;
      skills?: { label?: string; items?: string }[];
    };

    const proposed = Array.isArray(parsed.skills)
      ? parsed.skills
          .map((g) => ({ label: String(g?.label ?? ""), items: String(g?.items ?? "") }))
          .filter((g) => g.label || g.items)
      : [];
    const skills = reconcileSkills(content.skills, proposed);

    return NextResponse.json({
      positioning: typeof parsed.positioning === "string" ? parsed.positioning : "",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      summaryShort: typeof parsed.summaryShort === "string" ? parsed.summaryShort : "",
      skills,
    });
  } catch (err) {
    console.error("CV adapt error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
