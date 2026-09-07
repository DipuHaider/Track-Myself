import {
  AlignmentType, BorderStyle, Document, Paragraph, ShadingType,
  Table, TableCell, TableRow, WidthType,
} from "docx";
import type { CVContent } from "@/types/cv";
import { FONT, NO_BORDERS, bulletConfig, bulletPara, cell, CONTENT_W, p, pageMargin, txt } from "./shared";

const REF = "eu-bullets";
const EU_BLUE = "003399";
const LABEL_W = 3000;
const VALUE_W = 7440;
const EU_BULLETS = [99, 3, 2, 2, 2, 1, 2, 1, 2, 1];
const GRID_COLS = [2040, 1680, 1680, 1680, 1680, 1680];

function euHeading(text: string) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "E8EDF7" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: EU_BLUE, space: 6 } },
    children: [txt(`  ${text.toUpperCase()}`, { bold: true, size: 21, color: EU_BLUE })],
  });
}

function kvTable(
  pairs: [string, string | Paragraph[]][],
  labelW = LABEL_W,
  valueW = VALUE_W,
) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    borders: NO_BORDERS,
    rows: pairs.map(([k, v]) => new TableRow({
      children: [
        cell([p(txt(k, { bold: true, size: 19, color: "444444" }), { after: 20 })], labelW),
        cell(Array.isArray(v) ? v : [p(txt(v, { size: 19 }), { after: 20 })], valueW),
      ],
    })),
  });
}

function gridRow(cells: string[], opts: { fill?: string; bold?: boolean; color?: string } = {}) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      width: { size: GRID_COLS[i], type: WidthType.DXA },
      margins: { top: 50, bottom: 50, left: 80, right: 80 },
      shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      },
      children: [p(txt(c, { size: 17, bold: opts.bold, color: opts.color }), {
        after: 0,
        align: i === 0 ? undefined : AlignmentType.CENTER,
      })],
    })),
  });
}

export function buildEuropass(c: CVContent): Document {
  const children: (Paragraph | Table)[] = [];

  children.push(new Paragraph({
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: EU_BLUE, space: 4 } },
    children: [
      txt("EUROPASS", { bold: true, size: 30, color: EU_BLUE }),
      txt("   CURRICULUM VITAE", { size: 24, color: "666666" }),
    ],
  }));

  const web = [c.contact.portfolio, c.contact.linkedin, c.contact.github, c.contact.huggingface]
    .filter(Boolean)
    .map((link) => p(txt(link, { size: 19 }), { after: 10 }));

  const personal: [string, string | Paragraph[]][] = [
    ["Name", [p(txt(c.name, { bold: true, size: 24 }), { after: 20 })]],
  ];
  if (c.positioning) personal.push(["Job applied for", c.positioning]);
  if (c.contact.addressFull) personal.push(["Address", c.contact.addressFull]);
  if (c.contact.phone) personal.push(["Telephone", c.contact.phone]);
  if (c.contact.email) personal.push(["Email", c.contact.email]);
  if (web.length) personal.push(["Web presence", web]);
  if (c.personal.dobLong || c.personal.dob) {
    personal.push(["Date of birth", c.personal.dobLong || c.personal.dob]);
  }
  if (c.personal.nationality) personal.push(["Nationality", c.personal.nationality]);

  children.push(euHeading("Personal Information"));
  children.push(kvTable(personal));

  if (c.summary || c.availability) {
    children.push(euHeading("About Me"));
    if (c.summary) children.push(p(txt(c.summary, { size: 20 })));
    if (c.availability) {
      children.push(p(txt(c.availability, { size: 19, italics: true, color: "444444" })));
    }
  }

  if (c.experience.length) {
    children.push(euHeading("Work Experience"));
    c.experience.forEach((job, i) => {
      children.push(kvTable([[job.dates, [
        p(txt(job.title, { bold: true, size: 20 }), { after: 20 }),
        p(txt([job.company, job.location].filter(Boolean).join(" — "), { size: 19, color: "444444" }), { after: 10 }),
        ...(job.grade ? [p(txt(job.grade, { size: 18, italics: true, color: "666666" }), { after: 40 })] : []),
        ...job.bullets.slice(0, EU_BULLETS[i] ?? 1).map((b) => bulletPara(REF, b)),
        p(txt(""), { after: 80 }),
      ]]], 2400, 8040));
    });
  }

  if (c.education.length) {
    children.push(euHeading("Education and Training"));
    for (const e of c.education) {
      children.push(kvTable([[e.dates, [
        p(txt(e.degree, { bold: true, size: 20 }), { after: 20 }),
        p(txt(e.school, { size: 19 }), { after: e.note ? 10 : 60 }),
        ...(e.note ? [p(txt(e.note, { size: 18, italics: true, color: "555555" }), { after: 60 })] : []),
      ]]], 2400, 8040));
    }
  }

  if (c.languages.length) {
    children.push(euHeading("Language Skills"));

    const mother = c.languages.filter((l) => l.mother);
    const others = c.languages.filter((l) => !l.mother);

    if (mother.length) {
      children.push(p([
        txt("Mother tongue: ", { bold: true, size: 19 }),
        txt(mother.map((l) => l.name).join(", "), { size: 19 }),
      ], { after: 120 }));
    }

    if (others.length) {
      children.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: GRID_COLS,
        rows: [
          gridRow(
            ["Other languages", "Listening", "Reading", "Spoken interaction", "Spoken production", "Writing"],
            { bold: true, fill: "E8EDF7", color: EU_BLUE },
          ),
          ...others.map((l) => gridRow([
            l.name,
            l.cefr.listening || l.level,
            l.cefr.reading || l.level,
            l.cefr.spokenInteraction || l.level,
            l.cefr.spokenProduction || l.level,
            l.cefr.writing || l.level,
          ])),
        ],
      }));
      children.push(p(txt(
        "Levels: A1/A2 basic user · B1/B2 independent user · C1/C2 proficient user — Common European Framework of Reference for Languages",
        { size: 16, italics: true, color: "666666" },
      ), { before: 80 }));
    }
  }

  if (c.skills.length) {
    children.push(euHeading("Digital Skills"));
    children.push(kvTable(c.skills.map((g) => [g.label, g.items] as [string, string])));
  }

  if (c.certifications.length || c.awards.length || c.projects.length) {
    children.push(euHeading("Additional Information"));

    if (c.certifications.length) {
      children.push(p(txt("Certifications", { bold: true, size: 20 }), { before: 60, after: 60 }));
      c.certifications.forEach((item) => children.push(bulletPara(REF, item)));
    }

    if (c.awards.length) {
      children.push(p(txt("Awards", { bold: true, size: 20 }), { before: 140, after: 60 }));
      c.awards.forEach((item) => children.push(bulletPara(REF, item)));
    }

    if (c.projects.length) {
      children.push(p(txt("Selected Projects", { bold: true, size: 20 }), { before: 140, after: 60 }));
      for (const project of c.projects) {
        children.push(p([
          txt(`${project.name} — `, { bold: true, size: 19 }),
          txt(project.text, { size: 19 }),
        ], { after: 20 }));
        if (project.stack) {
          children.push(p(txt(project.stack, { size: 17, italics: true, color: "666666" }), { after: 80 }));
        }
      }
    }
  }

  return new Document({
    creator: c.name || "TrackMyself",
    title: `${c.name || "CV"} — Europass CV`,
    description: c.summaryShort || c.summary,
    styles: { default: { document: { run: { font: FONT } } } },
    numbering: { config: [bulletConfig(REF, "▪", 0.2, 0.15)] },
    sections: [{ properties: pageMargin(850, 850, 850, 850), children }],
  });
}
