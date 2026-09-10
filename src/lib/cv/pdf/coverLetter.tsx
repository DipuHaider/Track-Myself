import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CVContent } from "@/types/cv";
import type { AppInfo } from "@/lib/cv/docx";
import { FONT, FONT_BOLD, FONT_ITALIC, pt } from "./shared";

/* Mirrors src/lib/cv/docx/coverLetter.ts — same paragraphs, same order, same wording,
   so the two formats are the same letter. Keep the copy in step with that file. */
const s = StyleSheet.create({
  page: {
    paddingTop: 54, paddingBottom: 54, paddingHorizontal: 54,
    fontFamily: FONT, fontSize: pt(21), color: "#1a1a1a", lineHeight: 1.45,
  },
  date: { marginBottom: 18 },
  recipient: { marginBottom: 1 },
  company: { fontFamily: FONT_BOLD },
  subject: { fontFamily: FONT_BOLD, marginTop: 18, marginBottom: 14 },
  para: { marginBottom: 11 },
  note: { fontSize: pt(19), color: "#555555", fontFamily: FONT_ITALIC, marginBottom: 11 },
  signOff: { marginTop: 6, marginBottom: 20 },
  name: { fontFamily: FONT_BOLD, marginBottom: 2 },
  contact: { fontSize: pt(19), color: "#555555", marginBottom: 1 },
});

export function CoverLetterDocument({ content: c, info }: { content: CVContent; info: AppInfo }) {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const topSkills = c.skills.length
    ? c.skills[0].items.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4).join(", ")
    : "relevant technologies";

  const role = c.positioning || c.gradeTitle || "a dedicated professional";
  const contactLines = [c.contact.email, c.contact.phone, c.contact.linkedin].filter(Boolean);

  return (
    <Document
      title={`${c.name || "Cover Letter"} — ${info.companyName}`}
      author={c.name || "TrackMyself"}
      subject={`Cover letter for ${info.jobTitle} at ${info.companyName}`}
      creator="TrackMyself"
      producer="TrackMyself"
    >
      <Page size="A4" style={s.page}>
        <Text style={s.date}>{date}</Text>

        <Text style={s.recipient}>Hiring Manager</Text>
        <Text style={[s.recipient, s.company]}>{info.companyName}</Text>
        {Boolean(info.location) && <Text style={s.recipient}>{info.location}</Text>}

        <Text style={s.subject}>{`Re: Application for ${info.jobTitle}`}</Text>

        <Text style={s.para}>Dear Hiring Manager,</Text>

        <Text style={s.para}>
          {`I am writing to express my strong interest in the ${info.jobTitle} position at ${info.companyName}. ` +
            `With my background as ${role}, I am confident that my experience makes me a strong candidate for this role.`}
        </Text>

        {Boolean(info.notes) && (
          <Text style={s.note}>{`Role context: ${(info.notes ?? "").replace(/\n/g, " ")}`}</Text>
        )}

        <Text style={s.para}>
          {`Throughout my career I have developed expertise in ${topSkills}, which aligns directly with the requirements ` +
            `of this position. I am particularly drawn to ${info.companyName} because of its reputation for excellence, and ` +
            `I am eager to bring my experience to help your team achieve its goals.`}
        </Text>

        {Boolean(c.summary) && <Text style={s.para}>{c.summary}</Text>}

        <Text style={s.para}>
          {`I would welcome the opportunity to discuss how my background can contribute to ${info.companyName}'s ` +
            `continued success. My CV is attached for your consideration, and I am available for an interview at your ` +
            `earliest convenience.`}
        </Text>

        {Boolean(c.availability) && <Text style={s.para}>{c.availability}</Text>}

        <Text style={s.para}>Thank you for your time and consideration.</Text>

        <View wrap={false}>
          <Text style={s.signOff}>Yours sincerely,</Text>
          <Text style={s.name}>{c.name || "Your Name"}</Text>
          {contactLines.map((line, i) => <Text key={i} style={s.contact}>{line}</Text>)}
        </View>
      </Page>
    </Document>
  );
}
