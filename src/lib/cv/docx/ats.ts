import { BorderStyle, Document, Paragraph } from "docx";
import type { CVContent, CVVariant } from "@/types/cv";
import { contactLine, effectiveSkills, effectiveSummary, linkLine } from "@/lib/cv/content";
import { FONT, bulletConfig, bulletPara, p, pageMargin, txt } from "./shared";

const REF = "ats-bullets";
const COMPACT_BULLETS = [4, 3, 2, 2, 1, 1, 2, 1, 2, 1];

export function buildATS(c: CVContent, variant: CVVariant = "full", tailoredFor = ""): Document {
  const compact = variant === "compact";
  const summary = effectiveSummary(c, variant);
  const skills = effectiveSkills(c, variant);
  const certs = compact ? c.certifications.slice(0, 4) : c.certifications;

  function heading(text: string) {
    return new Paragraph({
      spacing: { before: compact ? 170 : 240, after: compact ? 70 : 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "444444", space: 2 } },
      children: [txt(text.toUpperCase(), { bold: true, size: 24, color: "1A1A1A" })],
    });
  }

  const children: Paragraph[] = [];

  children.push(p(txt(c.name.toUpperCase() || "YOUR NAME", { bold: true, size: 36 }), { after: 40 }));
  if (c.positioning) {
    children.push(p(txt(c.positioning, { size: 24, color: "444444" }), { after: 80 }));
  }
  children.push(p(txt(contactLine(c), { size: 19 })));
  if (linkLine(c)) children.push(p(txt(linkLine(c), { size: 19 }), { after: 160 }));

  if (tailoredFor) {
    children.push(p(txt(tailoredFor, { size: 19, italics: true, color: "444444" }), { after: 120 }));
  }

  if (summary || c.availability) {
    children.push(heading("Professional Summary"));
    if (summary) children.push(p(txt(summary, { size: 20 }), { after: 40 }));
    if (c.availability) children.push(p(txt(c.availability, { size: 20, italics: true })));
  }

  if (skills.length) {
    children.push(heading("Technical Skills"));
    for (const group of skills) {
      children.push(p([
        txt(group.label ? `${group.label}: ` : "", { bold: true, size: 20 }),
        txt(group.items, { size: 20 }),
      ]));
    }
  }

  if (c.experience.length) {
    children.push(heading("Professional Experience"));
    c.experience.forEach((job, i) => {
      children.push(new Paragraph({
        spacing: { before: compact ? 100 : 140, after: 20 },
        children: [
          txt(job.title, { bold: true, size: 21 }),
          txt([job.company, job.location].filter(Boolean).join(", ")
            ? `  |  ${[job.company, job.location].filter(Boolean).join(", ")}`
            : "", { size: 21 }),
        ],
      }));

      const meta = [job.dates, job.grade].filter(Boolean).join("  |  ");
      if (meta) {
        children.push(p(txt(meta, { size: 19, color: "555555", italics: true }), {
          after: compact ? 50 : 80,
        }));
      }

      const shown = compact ? job.bullets.slice(0, COMPACT_BULLETS[i] ?? 1) : job.bullets;
      shown.forEach((b) => children.push(bulletPara(REF, b, 20, compact ? 40 : 60)));
    });
  }

  if (!compact && c.projects.length) {
    children.push(heading("Selected Projects"));
    for (const project of c.projects) {
      children.push(p(txt(project.name, { bold: true, size: 20 }), { before: 100, after: 20 }));
      if (project.stack) {
        children.push(p(txt(project.stack, { size: 19, color: "555555", italics: true }), { after: 30 }));
      }
      if (project.text) children.push(p(txt(project.text, { size: 20 })));
    }
  }

  if (c.education.length) {
    children.push(heading("Education"));
    for (const e of (compact ? c.education.slice(0, 1) : c.education)) {
      children.push(p(txt(e.degree, { bold: true, size: 20 }), { before: 100, after: 20 }));
      const line = [e.school, e.dates, e.note].filter(Boolean).join("  |  ");
      if (line) children.push(p(txt(line, { size: 20 })));
    }
  }

  if (certs.length) {
    children.push(heading("Certifications"));
    certs.forEach((item) => children.push(bulletPara(REF, item, 20, compact ? 40 : 60)));
  }

  if (c.awards.length) {
    children.push(heading("Awards"));
    c.awards.forEach((item) => children.push(bulletPara(REF, item, 20, compact ? 40 : 60)));
  }

  if (c.languages.length) {
    children.push(heading("Languages"));
    for (const lang of c.languages) {
      children.push(p([
        txt(`${lang.name}: `, { bold: true, size: 20 }),
        txt(lang.level, { size: 20 }),
      ]));
    }
  }

  return new Document({
    creator: c.name || "TrackMyself",
    title: `${c.name || "CV"} — CV`,
    description: c.summaryShort || c.summary,
    styles: { default: { document: { run: { font: FONT } } } },
    numbering: { config: [bulletConfig(REF, "•")] },
    sections: [{ properties: pageMargin(720, 720, 720, 720), children }],
  });
}
