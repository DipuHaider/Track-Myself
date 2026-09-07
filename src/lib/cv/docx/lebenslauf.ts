import {
  AlignmentType, BorderStyle, Document, ImageRun, Paragraph,
  Table, TableCell, TableRow, VerticalAlign, WidthType,
} from "docx";
import type { CVContent } from "@/types/cv";
import {
  CONTENT_W, FONT, NO_BORDERS, bulletConfig, bulletPara, cell,
  decodePhoto, p, pageMargin, photoType, txt,
} from "./shared";

const REF = "ll-bullets";
const DATE_W = 2500;
const BODY_W = 7940;
const LL_BULLETS = [5, 3, 2, 2, 1, 1, 2, 1, 2, 1];

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 300, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "2C3547", space: 3 } },
    children: [txt(text.toUpperCase(), { bold: true, size: 22, color: "1A1A1A" })],
  });
}

function row(dateChildren: Paragraph[], bodyChildren: Paragraph[]) {
  return new TableRow({
    children: [cell(dateChildren, DATE_W), cell(bodyChildren, BODY_W)],
  });
}

function table(rows: TableRow[]) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [DATE_W, BODY_W],
    borders: NO_BORDERS,
    rows,
  });
}

export function buildLebenslauf(c: CVContent): Document {
  const children: (Paragraph | Table)[] = [];
  const photo = decodePhoto(c.photo);

  const headerRight: Paragraph[] = photo
    ? [new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        children: [new ImageRun({
          data: photo,
          type: photoType(c.photo),
          transformation: { width: 132, height: 170 },
        })],
      })]
    : [new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        border: {
          top: { style: BorderStyle.DASHED, size: 4, color: "AAAAAA", space: 2 },
          bottom: { style: BorderStyle.DASHED, size: 4, color: "AAAAAA", space: 2 },
          left: { style: BorderStyle.DASHED, size: 4, color: "AAAAAA", space: 2 },
          right: { style: BorderStyle.DASHED, size: 4, color: "AAAAAA", space: 2 },
        },
        children: [txt("Photo 35 × 45 mm", { size: 16, color: "999999" })],
      })];

  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [7640, 2800],
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 7640, type: WidthType.DXA },
          borders: NO_BORDERS,
          children: [
            p(txt("LEBENSLAUF", { bold: true, size: 20, color: "666666" }), { after: 120 }),
            p(txt(c.name, { bold: true, size: 34 }), { after: 40 }),
            p(txt(c.positioning, { size: 23, color: "444444" }), { after: 0 }),
          ],
        }),
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          borders: NO_BORDERS,
          verticalAlign: VerticalAlign.TOP,
          children: headerRight,
        }),
      ],
    })],
  }));

  children.push(p(txt(""), { after: 120 }));

  const details: [string, string][] = [
    ["Date of birth", c.personal.dobLong || c.personal.dob],
    ["Nationality", c.personal.nationality],
    ["Address", c.contact.addressFull || c.contact.city],
    ["Phone", c.contact.phone],
    ["Email", c.contact.email],
    ["LinkedIn", c.contact.linkedin],
    ["GitHub", c.contact.github],
    ["Portfolio", c.contact.portfolio],
  ];
  const shownDetails = details.filter(([, v]) => Boolean(v));

  if (shownDetails.length) {
    children.push(sectionHeading("Personal Details"));
    children.push(table(shownDetails.map(([k, v]) => row(
      [p(txt(k, { bold: true, size: 19 }), { after: 20 })],
      [p(txt(v, { size: 19 }), { after: 20 })],
    ))));
  }

  if (c.availability) {
    children.push(p(txt(c.availability, { size: 19, italics: true, color: "444444" }), {
      before: 140, after: 0,
    }));
  }

  if (c.summary) {
    children.push(sectionHeading("Profile"));
    children.push(p(txt(c.summary, { size: 20 })));
  }

  if (c.experience.length) {
    children.push(sectionHeading("Professional Experience"));
    children.push(table(c.experience.map((job, i) => row(
      [
        p(txt(job.dates, { bold: true, size: 19 }), { after: 20 }),
        p(txt(job.location, { size: 17, color: "777777" }), { after: 0 }),
      ],
      [
        p(txt(job.title, { bold: true, size: 20 }), { after: 20 }),
        p(txt(job.company + (job.grade ? `  ·  ${job.grade}` : ""), { size: 19, color: "444444" }), { after: 60 }),
        ...job.bullets.slice(0, LL_BULLETS[i] ?? 1).map((b) => bulletPara(REF, b)),
        p(txt(""), { after: 100 }),
      ],
    ))));
  }

  if (c.education.length) {
    children.push(sectionHeading("Education"));
    children.push(table(c.education.map((e) => row(
      [p(txt(e.dates, { bold: true, size: 19 }), { after: 20 })],
      [
        p(txt(e.degree, { bold: true, size: 20 }), { after: 20 }),
        p(txt(e.school, { size: 19 }), { after: e.note ? 20 : 100 }),
        ...(e.note ? [p(txt(e.note, { size: 18, italics: true, color: "555555" }), { after: 100 })] : []),
      ],
    ))));
  }

  if (c.skills.length) {
    children.push(sectionHeading("Technical Skills"));
    children.push(table(c.skills.map((g) => row(
      [p(txt(g.label, { bold: true, size: 19 }), { after: 20 })],
      [p(txt(g.items, { size: 19 }), { after: 20 })],
    ))));
  }

  if (c.certifications.length) {
    children.push(sectionHeading("Certifications"));
    c.certifications.forEach((item) => children.push(bulletPara(REF, item)));
  }

  if (c.awards.length) {
    children.push(sectionHeading("Awards"));
    c.awards.forEach((item) => children.push(bulletPara(REF, item)));
  }

  if (c.languages.length) {
    children.push(sectionHeading("Languages"));
    children.push(table(c.languages.map((l) => row(
      [p(txt(l.name, { bold: true, size: 19 }), { after: 20 })],
      [p(txt(l.level, { size: 19 }), { after: 20 })],
    ))));
  }

  const city = c.signatureCity || c.contact.city.split(",")[0]?.trim() || "";
  children.push(p(txt(`${city}${city ? ", " : ""}____________________`, { size: 19 }), {
    before: 260, after: 180,
  }));
  children.push(new Paragraph({
    spacing: { after: 40 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: "888888", space: 2 } },
    children: [txt("")],
  }));
  children.push(p(txt(c.name, { size: 19 })));

  return new Document({
    creator: c.name || "TrackMyself",
    title: `${c.name || "CV"} — Lebenslauf`,
    description: c.summaryShort || c.summary,
    styles: { default: { document: { run: { font: FONT } } } },
    numbering: { config: [bulletConfig(REF, "–", 0.2, 0.15)] },
    sections: [{ properties: pageMargin(900, 850, 900, 850), children }],
  });
}
