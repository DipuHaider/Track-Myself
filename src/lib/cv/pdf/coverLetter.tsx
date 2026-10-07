import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CVContent } from "@/types/cv";
import type { AppInfo } from "@/lib/cv/docx";
import type { CoverLetterText } from "@/lib/cv/coverLetter";
import { FONT, FONT_BOLD, pt } from "./shared";

const s = StyleSheet.create({
  page: {
    paddingTop: 54, paddingBottom: 54, paddingHorizontal: 54,
    fontFamily: FONT, fontSize: pt(21), color: "#1a1a1a", lineHeight: 1.45,
  },
  sender: { fontFamily: FONT_BOLD, fontSize: pt(24), marginBottom: 2 },
  contact: { fontSize: pt(19), color: "#555555", marginBottom: 1 },
  date: { marginTop: 18, marginBottom: 14 },
  recipient: { marginBottom: 1 },
  company: { fontFamily: FONT_BOLD },
  subject: { fontFamily: FONT_BOLD, marginTop: 18, marginBottom: 14 },
  para: { marginBottom: 11 },
  signOff: { marginTop: 4, marginBottom: 20 },
  name: { fontFamily: FONT_BOLD },
});

export function CoverLetterDocument({
  content: c,
  info,
  letter,
}: {
  content: CVContent;
  info: AppInfo;
  letter: CoverLetterText;
}) {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const contactLines = [c.contact.email, c.contact.phone, c.contact.city, c.contact.linkedin].filter(Boolean);

  return (
    <Document
      title={`${c.name || "Cover Letter"} — ${info.companyName}`}
      author={c.name || "TrackMyself"}
      subject={`Cover letter for ${info.jobTitle} at ${info.companyName}`}
      creator="TrackMyself"
      producer="TrackMyself"
    >
      <Page size="A4" style={s.page}>
        <Text style={s.sender}>{c.name || "Your Name"}</Text>
        {contactLines.map((line, i) => <Text key={i} style={s.contact}>{line}</Text>)}

        <Text style={s.date}>{date}</Text>
        <Text style={s.recipient}>{info.contactName || "Hiring Manager"}</Text>
        <Text style={[s.recipient, s.company]}>{info.companyName}</Text>
        {Boolean(info.location) && <Text style={s.recipient}>{info.location}</Text>}

        <Text style={s.subject}>{`Application for ${info.jobTitle}`}</Text>

        <Text style={s.para}>{letter.greeting}</Text>
        {letter.paragraphs.map((para, i) => <Text key={i} style={s.para}>{para}</Text>)}

        <View wrap={false}>
          <Text style={s.signOff}>{letter.closing}</Text>
          <Text style={s.name}>{c.name || "Your Name"}</Text>
        </View>
      </Page>
    </Document>
  );
}
