export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import type { CVData } from "@/lib/cvDownload";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { cvData, jobDescription } = (await req.json()) as {
    cvData: CVData;
    jobDescription: string;
  };

  if (!jobDescription?.trim()) {
    return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  const prompt = `You are an expert CV writer. Adapt the candidate's CV so it is tailored to the job description below.
Keep facts accurate — only reframe and reorder existing information to best match the role. Do not invent experience.

CANDIDATE CV:
Name: ${cvData.name || "N/A"}
Current Title: ${cvData.title || "N/A"}
Summary: ${cvData.summary || "N/A"}
Experience: ${cvData.experience || "N/A"}
Education: ${cvData.education || "N/A"}
Skills: ${cvData.skills || "N/A"}
Languages: ${cvData.languages || "N/A"}

JOB DESCRIPTION:
${jobDescription.trim()}

Return ONLY a valid JSON object with these keys (no markdown, no explanation):
{
  "title": "job-aligned professional title (2-5 words)",
  "summary": "tailored 3-5 sentence summary highlighting fit for this role",
  "experience": "reframed experience entries emphasising relevant achievements (keep the same format as input)",
  "skills": "skills reordered so most relevant to the job come first"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
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

    const adapted = JSON.parse(jsonMatch[0]) as Partial<CVData>;
    return NextResponse.json(adapted);
  } catch (err) {
    console.error("CV adapt error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
