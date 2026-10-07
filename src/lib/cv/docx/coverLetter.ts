import { Document, Paragraph } from "docx";
import type { CVContent } from "@/types/cv";
import type { CoverLetterText } from "@/lib/cv/coverLetter";
import { FONT, p, pageMargin, txt } from "./shared";

export type AppInfo = {
  companyName: string;
  jobTitle: string;
  location?: string;
  notes?: string;
  jobPostUrl?: string;
  platform?: string;
  jobDescription?: string;
  contactName?: string;
};

export function buildCoverLetter(c: CVContent, info: AppInfo, letter: CoverLetterText): Document {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const children: Paragraph[] = [];

  children.push(p(txt(c.name || "Your Name", { bold: true, size: 24 }), { after: 40 }));
  for (const line of [c.contact.email, c.contact.phone, c.contact.city, c.contact.linkedin].filter(Boolean)) {
    children.push(p(txt(line, { size: 19, color: "555555" }), { after: 20 }));
  }

  children.push(p(txt(date, { size: 21 }), { before: 320, after: 240 }));
  children.push(p(txt(info.contactName || "Hiring Manager", { size: 21 }), { after: 40 }));
  children.push(p(txt(info.companyName, { bold: true, size: 21 }), { after: 40 }));
  if (info.location) children.push(p(txt(info.location, { size: 21 }), { after: 40 }));

  children.push(p(txt(`Application for ${info.jobTitle}`, { bold: true, size: 21 }), {
    before: 320, after: 240,
  }));

  children.push(p(txt(letter.greeting, { size: 21 }), { after: 200 }));
  for (const para of letter.paragraphs) {
    children.push(p(txt(para, { size: 21 }), { after: 200 }));
  }

  children.push(p(txt(letter.closing, { size: 21 }), { before: 80, after: 320 }));
  children.push(p(txt(c.name || "Your Name", { bold: true, size: 21 }), { after: 40 }));

  return new Document({
    creator: c.name || "TrackMyself",
    title: `${c.name || "Cover Letter"} — ${info.companyName}`,
    description: `Cover letter for ${info.jobTitle} at ${info.companyName}`,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: pageMargin(1000, 1000, 1000, 1000), children }],
  });
}
