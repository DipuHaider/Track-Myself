import { sectionise } from "@/lib/cv/import/parseText";
import { normaliseForDiff } from "./normalise";
import { countWords, diffWords, hasRealChange, type DiffOp } from "./wordDiff";
import { SECTION_LABELS, SECTION_ORDER } from "./contentText";

export type SectionDiff = {
  key: string;
  label: string;
  left: string;
  right: string;
  ops: DiffOp[];
  changed: boolean;
  onlyIn: "left" | "right" | null;
  degraded: boolean;
};

export type DocDiff = {
  sections: SectionDiff[];
  stats: { added: number; removed: number; changedSections: number };
  degraded: boolean;
  empty: boolean;
};

/**
 * Diffs section-against-section rather than across the whole document, so a block
 * that moved does not cascade every following line into a false difference.
 *
 * Measured against real PDFs rendered by our own builders and read back through
 * unpdf, comparing content with itself so every reported change is pure noise:
 *
 *   single column (ATS)        0% noise  — the representative case, since the left
 *                                          side in production is the user's own CV
 *   sidebar layout (Designer)  19%       — the sidebar extracts as one run, so its
 *                                          skills land under a neighbouring heading
 *   table layout (Europass)    40%       — caption and value columns interleave, so
 *                                          section order does not survive extraction
 *
 * Two-column and table sources are therefore approximate by construction. Tightening
 * them means teaching the extractor about column geometry, not tuning this file —
 * caption-stripping heuristics aggressive enough to help also eat real headings.
 */
export function diffDocuments(
  leftText: string,
  rightSections: Record<string, string>,
): DocDiff {
  const leftBuckets = sectionise(normaliseForDiff(leftText).split("\n"));
  const left: Record<string, string> = {};
  for (const [key, lines] of Object.entries(leftBuckets)) {
    const v = lines.join("\n").trim();
    if (v) left[key] = v;
  }
  return diffSectionMaps(left, rightSections);
}

/** Both sides already bucketed — used when the left side is CVContent, not a file. */
export function diffSectionMaps(
  left: Record<string, string>,
  rightSections: Record<string, string>,
): DocDiff {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(rightSections)])]
    .sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  const sections: SectionDiff[] = [];
  let added = 0;
  let removed = 0;
  let degraded = false;

  for (const key of keys) {
    const l = left[key] ?? "";
    const r = rightSections[key] ?? "";
    const { ops, degraded: d } = diffWords(l, normaliseForDiff(r));
    if (d) degraded = true;

    const changed = hasRealChange(ops);
    added += countWords(ops, "insert");
    removed += countWords(ops, "delete");

    sections.push({
      key,
      label: SECTION_LABELS[key] ?? key.replace(/^_/, "").replace(/\b\w/g, (c) => c.toUpperCase()),
      left: l,
      right: r,
      ops,
      changed,
      onlyIn: l && !r ? "left" : r && !l ? "right" : null,
      degraded: d,
    });
  }

  const changedSections = sections.filter((s) => s.changed).length;

  return {
    sections,
    stats: { added, removed, changedSections },
    degraded,
    empty: changedSections === 0,
  };
}
