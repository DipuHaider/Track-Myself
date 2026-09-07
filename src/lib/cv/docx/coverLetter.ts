import { Document, Paragraph } from "docx";
import type { CVContent } from "@/types/cv";
import { FONT, p, pageMargin, txt } from "./shared";

export type AppInfo = {
  companyName: string;
  jobTitle: string;
  location?: string;
  notes?: string;
};

export function buildCoverLetter(c: CVContent, info: AppInfo): Document {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const topSkills = c.skills.length
    ? c.skills[0].items.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4).join(", ")
    : "relevant technologies";

  const role = c.positioning || c.gradeTitle || "a dedicated professional";
  const children: Paragraph[] = [];

  children.push(p(txt(date, { size: 21 }), { after: 320 }));
  children.push(p(txt("Hiring Manager", { size: 21 }), { after: 40 }));
  children.push(p(txt(info.companyName, { bold: true, size: 21 }), { after: 40 }));
  if (info.location) children.push(p(txt(info.location, { size: 21 }), { after: 40 }));

  children.push(p(txt(`Re: Application for ${info.jobTitle}`, { bold: true, size: 21 }), {
    before: 320, after: 240,
  }));

  children.push(p(txt("Dear Hiring Manager,", { size: 21 }), { after: 200 }));

  children.push(p(txt(
    `I am writing to express my strong interest in the ${info.jobTitle} position at ${info.companyName}. ` +
    `With my background as ${role}, I am confident that my experience makes me a strong candidate for this role.`,
    { size: 21 },
  ), { after: 200 }));

  if (info.notes) {
    children.push(p(txt(`Role context: ${info.notes.replace(/\n/g, " ")}`, {
      size: 19, italics: true, color: "555555",
    }), { after: 200 }));
  }

  children.push(p(txt(
    `Throughout my career I have developed expertise in ${topSkills}, which aligns directly with the requirements ` +
    `of this position. I am particularly drawn to ${info.companyName} because of its reputation for excellence, and ` +
    `I am eager to bring my experience to help your team achieve its goals.`,
    { size: 21 },
  ), { after: 200 }));

  if (c.summary) {
    children.push(p(txt(c.summary, { size: 21 }), { after: 200 }));
  }

  children.push(p(txt(
    `I would welcome the opportunity to discuss how my background can contribute to ${info.companyName}'s ` +
    `continued success. My CV is attached for your consideration, and I am available for an interview at your ` +
    `earliest convenience.`,
    { size: 21 },
  ), { after: 200 }));

  if (c.availability) children.push(p(txt(c.availability, { size: 21 }), { after: 200 }));

  children.push(p(txt("Thank you for your time and consideration.", { size: 21 }), { after: 280 }));
  children.push(p(txt("Yours sincerely,", { size: 21 }), { after: 320 }));
  children.push(p(txt(c.name || "Your Name", { bold: true, size: 21 }), { after: 40 }));

  for (const line of [c.contact.email, c.contact.phone, c.contact.linkedin].filter(Boolean)) {
    children.push(p(txt(line, { size: 19, color: "555555" }), { after: 20 }));
  }

  return new Document({
    creator: c.name || "TrackMyself",
    title: `${c.name || "Cover Letter"} — ${info.companyName}`,
    description: `Cover letter for ${info.jobTitle} at ${info.companyName}`,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: pageMargin(1000, 1000, 1000, 1000), children }],
  });
}
