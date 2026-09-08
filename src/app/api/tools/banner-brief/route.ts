export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, number[]>();

const STYLES = ["gradient", "mesh", "grid", "dots", "waves", "solid"];
const LAYOUTS = ["left", "center", "split"];

type Palette = {
  background: string;
  backgroundAlt: string;
  accent: string;
  text: string;
  muted: string;
};

const THEMES: { match: RegExp; palette: Palette; style: string }[] = [
  {
    match: /\b(ai|ml|machine learning|llm|data|scien|analytic)\w*/i,
    palette: { background: "#04141c", backgroundAlt: "#0b3b45", accent: "#22d3ee", text: "#f0fdfa", muted: "#7dd3fc" },
    style: "mesh",
  },
  {
    match: /\b(security|cyber|devsecops|pentest|infosec)\w*/i,
    palette: { background: "#07120c", backgroundAlt: "#10281c", accent: "#34d399", text: "#ecfdf5", muted: "#6ee7b7" },
    style: "grid",
  },
  {
    match: /\b(design|creative|brand|ux|ui|art|portfolio)\w*/i,
    palette: { background: "#1a0b2e", backgroundAlt: "#3b1259", accent: "#f472b6", text: "#fdf4ff", muted: "#e9d5ff" },
    style: "waves",
  },
  {
    match: /\b(market|growth|sales|content|seo|founder|product)\w*/i,
    palette: { background: "#1c1207", backgroundAlt: "#3a2410", accent: "#fbbf24", text: "#fffbeb", muted: "#fcd34d" },
    style: "gradient",
  },
  {
    match: /\b(cloud|devops|infra|platform|kubernetes|sre)\w*/i,
    palette: { background: "#0a1020", backgroundAlt: "#152744", accent: "#60a5fa", text: "#eff6ff", muted: "#93c5fd" },
    style: "dots",
  },
];

const DEFAULT_PALETTE: Palette = {
  background: "#0b1220",
  backgroundAlt: "#1e293b",
  accent: "#3b82f6",
  text: "#f8fafc",
  muted: "#94a3b8",
};

const STOP_WORDS = new Set([
  "a", "an", "the", "for", "with", "and", "of", "in", "on", "to", "my", "me", "i",
  "am", "is", "are", "banner", "profile", "linkedin", "github", "make", "create",
  "generate", "please", "want", "need", "who", "that", "this", "at", "as", "by",
]);

function clientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "anonymous";
}

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function titleCase(text: string) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function localBrief(prompt: string) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  const clauses = clean.split(/[.·—|,;]\s*/).map((c) => c.trim()).filter(Boolean);

  const theme = THEMES.find((t) => t.match.test(clean));
  const palette = theme?.palette ?? DEFAULT_PALETTE;

  const headline = titleCase((clauses[0] ?? clean).split(/\s+/).slice(0, 5).join(" "));
  const subheadline = clauses[1] ? titleCase(clauses[1].split(/\s+/).slice(0, 8).join(" ")) : "";
  const tagline = clauses.slice(2).join(" · ").slice(0, 100);

  const used = new Set(
    `${headline} ${subheadline}`.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean),
  );

  const tokens = clean.split(/[^A-Za-z0-9+#.]+/).filter(Boolean);

  const scored = tokens
    .filter((raw) => {
      const lower = raw.toLowerCase();
      if (lower.length < 2 || STOP_WORDS.has(lower) || used.has(lower)) return false;
      return !/^\d+$/.test(lower);
    })
    .map((raw) => ({
      raw,
      score: (/[A-Z]/.test(raw.slice(1)) ? 3 : 0) + (/[+#.]/.test(raw) ? 2 : 0) + (/^[A-Z]/.test(raw) ? 1 : 0),
    }));

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const { raw } of scored.sort((a, b) => b.score - a.score)) {
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(/[A-Z]/.test(raw.slice(1)) ? raw : titleCase(raw));
    if (keywords.length === 5) break;
  }

  return {
    headline: headline || "Your Name",
    subheadline,
    tagline,
    keywords,
    palette,
    style: theme?.style ?? "gradient",
    layout: "left",
    source: "local" as const,
  };
}

function sanitisePalette(raw: unknown): Palette {
  const p = (raw ?? {}) as Record<string, unknown>;
  const hex = (value: unknown, fallback: string) =>
    typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : fallback;

  return {
    background: hex(p.background, DEFAULT_PALETTE.background),
    backgroundAlt: hex(p.backgroundAlt, DEFAULT_PALETTE.backgroundAlt),
    accent: hex(p.accent, DEFAULT_PALETTE.accent),
    text: hex(p.text, DEFAULT_PALETTE.text),
    muted: hex(p.muted, DEFAULT_PALETTE.muted),
  };
}

export async function POST(req: Request) {
  if (rateLimited(clientKey(req))) {
    return NextResponse.json(
      { error: "Too many requests from this address. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").slice(0, 1200).trim();
  const platform = String(body.platform ?? "LinkedIn").slice(0, 40);

  if (!prompt) {
    return NextResponse.json({ error: "Describe the banner you want." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(localBrief(prompt));
  }

  const instruction = `You design profile banners. Turn the request below into a banner brief for ${platform}.

REQUEST: ${prompt}

Rules:
- headline: the person's name or the single strongest phrase. Max 5 words, no punctuation at the end.
- subheadline: their role or positioning. Max 8 words.
- tagline: one short supporting line, max 12 words. Empty string if the request gives nothing to say.
- keywords: 3-5 short skill or topic chips, 1-2 words each, title case.
- palette: hex colours that suit the field. Dark background reads best; text must contrast strongly against background.
- style: one of gradient, mesh, grid, dots, waves, solid.
- layout: one of left, center, split.

Return ONLY this JSON object, no markdown:
{"headline":"","subheadline":"","tagline":"","keywords":[],"palette":{"background":"#","backgroundAlt":"#","accent":"#","text":"#","muted":"#"},"style":"","layout":""}`;

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
        max_tokens: 800,
        messages: [{ role: "user", content: instruction }],
      }),
    });

    if (!res.ok) return NextResponse.json(localBrief(prompt));

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json(localBrief(prompt));

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const fallback = localBrief(prompt);

    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k) => String(k).slice(0, 22)).filter(Boolean).slice(0, 6)
      : fallback.keywords;

    return NextResponse.json({
      headline: String(parsed.headline ?? fallback.headline).slice(0, 60),
      subheadline: String(parsed.subheadline ?? "").slice(0, 90),
      tagline: String(parsed.tagline ?? "").slice(0, 120),
      keywords,
      palette: sanitisePalette(parsed.palette),
      style: STYLES.includes(String(parsed.style)) ? String(parsed.style) : fallback.style,
      layout: LAYOUTS.includes(String(parsed.layout)) ? String(parsed.layout) : "left",
      source: "ai" as const,
    });
  } catch {
    return NextResponse.json(localBrief(prompt));
  }
}
