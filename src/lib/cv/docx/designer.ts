import {
  AlignmentType, BorderStyle, Document, ImageRun, Paragraph, ShadingType,
  Table, TableCell, TableRow, VerticalAlign, WidthType,
} from "docx";
import type { CVContent } from "@/types/cv";
import { contactLine, linkLine } from "@/lib/cv/content";
import {
  CONTENT_W, FONT, NO_BORDERS, bulletConfig, bulletPara,
  decodePhoto, p, pageMargin, photoType, txt,
} from "./shared";

const REF = "dsgn-bullets";
const BAND = "111827";
const ACCENT = "4F46E5";
const SIDE_W = 3200;
const MAIN_W = 7240;

function accentHeading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 90 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: ACCENT, space: 3 } },
    children: [txt(text.toUpperCase(), { bold: true, size: 22, color: ACCENT })],
  });
}

function sideHeading(text: string) {
  return p(txt(text.toUpperCase(), { bold: true, size: 17, color: "A5B4FC" }), {
    before: 160, after: 60,
  });
}

export function buildDesigner(c: CVContent): Document {
  const children: (Paragraph | Table)[] = [];
  const photo = decodePhoto(c.photo);

  const bandLeft: Paragraph[] = [
    p(txt(c.name || "Your Name", { bold: true, size: 34, color: "FFFFFF" }), { after: 40 }),
    p(txt(c.positioning, { size: 23, color: "C7D2FE" }), { after: 100 }),
    p(txt(contactLine(c), { size: 18, color: "E5E7EB" }), { after: 20 }),
    ...(linkLine(c) ? [p(txt(linkLine(c), { size: 18, color: "E5E7EB" }), { after: 0 })] : []),
  ];

  const bandRight: Paragraph[] = photo
    ? [new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        children: [new ImageRun({
          data: photo,
          type: photoType(c.photo),
          transformation: { width: 104, height: 134 },
        })],
      })]
    : [p(txt(""), { after: 0 })];

  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [7640, 2800],
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 7640, type: WidthType.DXA },
          borders: NO_BORDERS,
          shading: { type: ShadingType.CLEAR, fill: BAND },
          margins: { top: 240, bottom: 240, left: 240, right: 160 },
          children: bandLeft,
        }),
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          borders: NO_BORDERS,
          shading: { type: ShadingType.CLEAR, fill: BAND },
          margins: { top: 200, bottom: 200, left: 100, right: 240 },
          verticalAlign: VerticalAlign.CENTER,
          children: bandRight,
        }),
      ],
    })],
  }));

  children.push(p(txt(""), { after: 60 }));

  const sidebar: Paragraph[] = [];

  if (c.skills.length) {
    sidebar.push(sideHeading("Skills"));
    for (const group of c.skills) {
      sidebar.push(p(txt(group.label, { bold: true, size: 17, color: "FFFFFF" }), { after: 10 }));
      sidebar.push(p(txt(group.items, { size: 16, color: "D1D5DB" }), { after: 70 }));
    }
  }

  if (c.languages.length) {
    sidebar.push(sideHeading("Languages"));
    for (const lang of c.languages) {
      sidebar.push(p([
        txt(`${lang.name}`, { bold: true, size: 17, color: "FFFFFF" }),
        txt(lang.level ? ` — ${lang.level}` : "", { size: 16, color: "D1D5DB" }),
      ], { after: 40 }));
    }
  }

  if (c.certifications.length) {
    sidebar.push(sideHeading("Certifications"));
    for (const item of c.certifications) {
      sidebar.push(p(txt(`· ${item}`, { size: 16, color: "D1D5DB" }), { after: 40 }));
    }
  }

  if (c.awards.length) {
    sidebar.push(sideHeading("Awards"));
    for (const item of c.awards) {
      sidebar.push(p(txt(`· ${item}`, { size: 16, color: "D1D5DB" }), { after: 40 }));
    }
  }

  if (c.availability) {
    sidebar.push(sideHeading("Availability"));
    sidebar.push(p(txt(c.availability, { size: 16, color: "D1D5DB" }), { after: 40 }));
  }

  const main: Paragraph[] = [];

  if (c.summary) {
    main.push(accentHeading("Profile"));
    main.push(p(txt(c.summary, { size: 20 })));
  }

  if (c.experience.length) {
    main.push(accentHeading("Experience"));
    for (const job of c.experience) {
      main.push(p(txt(job.title, { bold: true, size: 21 }), { before: 120, after: 20 }));
      main.push(p(txt(
        [job.company, job.location].filter(Boolean).join(", "),
        { size: 19, color: "4B5563" },
      ), { after: 10 }));
      const meta = [job.dates, job.grade].filter(Boolean).join("  ·  ");
      if (meta) main.push(p(txt(meta, { size: 18, italics: true, color: ACCENT }), { after: 60 }));
      job.bullets.forEach((b) => main.push(bulletPara(REF, b, 19, 50)));
    }
  }

  if (c.projects.length) {
    main.push(accentHeading("Selected Projects"));
    for (const project of c.projects) {
      main.push(p(txt(project.name, { bold: true, size: 20 }), { before: 100, after: 20 }));
      if (project.stack) {
        main.push(p(txt(project.stack, { size: 17, italics: true, color: ACCENT }), { after: 30 }));
      }
      if (project.text) main.push(p(txt(project.text, { size: 19 })));
    }
  }

  if (c.education.length) {
    main.push(accentHeading("Education"));
    for (const e of c.education) {
      main.push(p(txt(e.degree, { bold: true, size: 20 }), { before: 100, after: 20 }));
      const line = [e.school, e.dates].filter(Boolean).join("  ·  ");
      if (line) main.push(p(txt(line, { size: 19, color: "4B5563" }), { after: e.note ? 10 : 60 }));
      if (e.note) main.push(p(txt(e.note, { size: 18, italics: true, color: "6B7280" })));
    }
  }

  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [SIDE_W, MAIN_W],
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: SIDE_W, type: WidthType.DXA },
          borders: NO_BORDERS,
          shading: { type: ShadingType.CLEAR, fill: "1E293B" },
          margins: { top: 200, bottom: 200, left: 200, right: 160 },
          children: sidebar.length ? sidebar : [p(txt(""))],
        }),
        new TableCell({
          width: { size: MAIN_W, type: WidthType.DXA },
          borders: NO_BORDERS,
          margins: { top: 120, bottom: 200, left: 260, right: 60 },
          children: main.length ? main : [p(txt(""))],
        }),
      ],
    })],
  }));

  return new Document({
    creator: c.name || "TrackMyself",
    title: `${c.name || "CV"} — Designer CV`,
    description: c.summaryShort || c.summary,
    styles: { default: { document: { run: { font: FONT } } } },
    numbering: { config: [bulletConfig(REF, "▸", 0.2, 0.15)] },
    sections: [{ properties: pageMargin(600, 600, 600, 600), children }],
  });
}
