import {
  AlignmentType, BorderStyle, LevelFormat, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
  convertInchesToTwip,
} from "docx";

export const FONT = "Calibri";
export const CONTENT_W = 10440;

export const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
export const NO_BORDERS = {
  top: NONE, bottom: NONE, left: NONE, right: NONE,
  insideHorizontal: NONE, insideVertical: NONE,
};

type TxtOpts = {
  size?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  font?: string;
};

export function txt(text: string, o: TxtOpts = {}) {
  return new TextRun({
    text,
    font: o.font ?? FONT,
    size: o.size ?? 20,
    bold: o.bold,
    italics: o.italics,
    color: o.color,
  });
}

type ParaOpts = {
  after?: number;
  before?: number;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
};

export function p(runs: TextRun | TextRun[], o: ParaOpts = {}) {
  return new Paragraph({
    spacing: { after: o.after ?? 60, before: o.before ?? 0 },
    alignment: o.align,
    children: Array.isArray(runs) ? runs : [runs],
  });
}

export function bulletPara(reference: string, text: string, size = 19, after = 40) {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { after },
    children: [txt(text, { size })],
  });
}

export function bulletConfig(reference: string, glyph: string, indent = 0.25, hanging = 0.18) {
  return {
    reference,
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: glyph,
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(indent),
            hanging: convertInchesToTwip(hanging),
          },
        },
      },
    }],
  };
}

export function cell(
  children: (Paragraph | Table)[],
  width: number,
  opts: { fill?: string; left?: number; right?: number } = {},
) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 50, bottom: 50, right: opts.right ?? 160, left: opts.left ?? 0 },
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.TOP,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    children,
  });
}

export function twoColTable(
  rows: { left: (Paragraph | Table)[]; right: (Paragraph | Table)[] }[],
  leftW: number,
  rightW: number,
  opts: { leftFill?: string; rightFill?: string; leftPad?: number } = {},
) {
  return new Table({
    width: { size: leftW + rightW, type: WidthType.DXA },
    columnWidths: [leftW, rightW],
    borders: NO_BORDERS,
    rows: rows.map((r) => new TableRow({
      children: [
        cell(r.left, leftW, { fill: opts.leftFill, left: opts.leftPad }),
        cell(r.right, rightW, { fill: opts.rightFill }),
      ],
    })),
  });
}

export function pageMargin(top: number, right: number, bottom: number, left: number) {
  return { page: { margin: { top, right, bottom, left } } };
}

export function decodePhoto(photo: string): Buffer | null {
  if (!photo) return null;
  const match = photo.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
  const base64 = match ? match[2] : /^[A-Za-z0-9+/=\s]+$/.test(photo) ? photo : null;
  if (!base64) return null;
  try {
    return Buffer.from(base64.replace(/\s/g, ""), "base64");
  } catch {
    return null;
  }
}

export function photoType(photo: string): "png" | "jpg" | "gif" {
  const match = photo.match(/^data:image\/(png|jpeg|jpg|gif|webp)/i);
  const kind = match?.[1]?.toLowerCase();
  if (kind === "jpeg" || kind === "jpg") return "jpg";
  if (kind === "gif") return "gif";
  return "png";
}
