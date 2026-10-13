import type { CVContent } from "@/types/cv";
import { cvSections, postingTerms } from "@/lib/ai/jobFit";

const GERMAN_STOP = new Set([
  "und", "oder", "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines",
  "mit", "für", "fur", "von", "bei", "auf", "aus", "als", "auch", "sich", "sie", "wir", "ihr", "ihre", "ihren",
  "ihrer", "unser", "unsere", "unseren", "unserem", "unserer", "zum", "zur", "über", "uber", "nach", "sowie",
  "sind", "ist", "wird", "werden", "haben", "hast", "hat", "dich", "dir", "du", "deine", "deinen", "deiner",
  "freuen", "bieten", "suchen", "aufgaben", "profil", "kenntnisse", "erfahrung", "erfahrungen", "gute", "sehr",
  "team", "teams", "unternehmen", "bewerbung", "standort", "vollzeit", "teilzeit", "möglich", "moglich", "mwd",
  "m/w/d", "gmbh", "bereich", "rahmen", "neue", "neuen", "eigenverantwortlich", "arbeiten", "arbeitest",
  "bringst", "mit", "dein", "deiner", "vorteile", "benefits", "jobs", "job", "stelle", "stellen",
]);

function tokenSet(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/[^a-z0-9+#äöüß]+/).filter((w) => w.length >= 2),
  );
}

export type FitScore = { score: number; matched: string[]; missing: string[] };

/* Word overlap between the CV and the posting, scaled so a typical strong match
   lands near 80. It ranks a daily list cheaply and deterministically; it is
   not a judgement of ability, and the UI labels it as word matching. The
   title counts extra because a posting for the role the CV already describes
   is the strongest cheap signal there is. */
export function fitScore(cv: CVContent, title: string, description: string): FitScore {
  const cvWords = tokenSet(cvSections(cv));
  const terms = postingTerms(`${title}\n${description}`).filter((t) => !GERMAN_STOP.has(t));
  if (!terms.length || !cvWords.size) return { score: 0, matched: [], missing: [] };

  const matched = terms.filter((t) => cvWords.has(t));
  const missing = terms.filter((t) => !cvWords.has(t));

  const ratio = matched.length / Math.min(terms.length, 60);
  const titleTerms = postingTerms(title).filter((t) => !GERMAN_STOP.has(t));
  const titleHit = titleTerms.length ? titleTerms.filter((t) => cvWords.has(t)).length / titleTerms.length : 0;

  const score = Math.round(Math.min(1, ratio / 0.45) * 80 + titleHit * 20);
  return { score: Math.max(0, Math.min(100, score)), matched: matched.slice(0, 20), missing: missing.slice(0, 12) };
}
