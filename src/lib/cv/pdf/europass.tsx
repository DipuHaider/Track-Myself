import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CVContent } from "@/types/cv";
import { FONT, FONT_BOLD, FONT_ITALIC, pt } from "./shared";

/* Mirrors src/lib/cv/docx/europass.ts — the EU label/value structure and section
   order. No photo, per the same rule the .docx builder follows. */
const EU_BLUE = "#003399";

const s = StyleSheet.create({
  page: {
    paddingTop: 40, paddingBottom: 44, paddingHorizontal: 42,
    fontFamily: FONT, fontSize: pt(19), color: "#1a1a1a", lineHeight: 1.35,
  },
  name: { fontFamily: FONT_BOLD, fontSize: pt(32), color: EU_BLUE, marginBottom: 2 },
  positioning: { fontSize: pt(22), color: "#444444", marginBottom: 10 },
  heading: {
    fontFamily: FONT_BOLD, fontSize: pt(21), color: EU_BLUE, textTransform: "uppercase",
    borderBottomWidth: 1, borderBottomColor: EU_BLUE, paddingBottom: 2,
    marginTop: 13, marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  key: { width: 128, fontFamily: FONT_BOLD, fontSize: pt(19), color: "#444444", paddingRight: 8 },
  value: { flex: 1, fontSize: pt(19) },
  jobTitle: { fontFamily: FONT_BOLD, fontSize: pt(20) },
  jobMeta: { fontSize: pt(18), color: "#555555", fontFamily: FONT_ITALIC, marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  glyph: { width: 10, fontSize: pt(18) },
  bulletText: { flex: 1, fontSize: pt(18) },
  gridHead: { flexDirection: "row", backgroundColor: "#eef2ff", paddingVertical: 3 },
  gridCell: { flex: 1, fontSize: pt(17), textAlign: "center" },
  gridCellL: { flex: 1.4, fontSize: pt(17), paddingLeft: 4 },
  gridRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d9d9d9", paddingVertical: 3 },
});

function KV({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.key}>{k}</Text>
      <Text style={s.value}>{v}</Text>
    </View>
  );
}

export function EuropassDocument({ content: c }: { content: CVContent }) {
  const personal: [string, string][] = [
    ["Address", c.contact.addressFull || c.contact.city],
    ["Telephone", c.contact.phone],
    ["Email", c.contact.email],
    ["LinkedIn", c.contact.linkedin],
    ["Portfolio", c.contact.portfolio],
    ["Date of birth", c.personal.dobLong || c.personal.dob],
    ["Nationality", c.personal.nationality],
  ];

  return (
    <Document
      title={`${c.name || "CV"} — Europass CV`}
      author={c.name || "TrackMyself"}
      creator="TrackMyself"
      producer="TrackMyself"
    >
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{c.name || "Your Name"}</Text>
        {Boolean(c.positioning) && <Text style={s.positioning}>{c.positioning}</Text>}

        <Text style={s.heading}>Personal Information</Text>
        {personal.map(([k, v]) => <KV key={k} k={k} v={v} />)}

        {Boolean(c.summary) && (
          <>
            <Text style={s.heading}>About Me</Text>
            <Text>{c.summary}</Text>
          </>
        )}

        {c.experience.length > 0 && (
          <>
            <Text style={s.heading}>Work Experience</Text>
            {c.experience.map((job, i) => {
              const where = [job.company, job.location].filter(Boolean).join(", ");
              return (
                <View key={i} style={{ marginBottom: 7 }} wrap={false}>
                  <Text style={s.jobMeta}>{job.dates}</Text>
                  <Text style={s.jobTitle}>{job.title}</Text>
                  {Boolean(where) && <Text style={s.value}>{where}</Text>}
                  {job.bullets.map((b, j) => (
                    <View key={j} style={s.bulletRow} wrap={false}>
                      <Text style={s.glyph}>•</Text>
                      <Text style={s.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}

        {c.education.length > 0 && (
          <>
            <Text style={s.heading}>Education and Training</Text>
            {c.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 5 }} wrap={false}>
                <Text style={s.jobMeta}>{e.dates}</Text>
                <Text style={s.jobTitle}>{e.degree}</Text>
                <Text style={s.value}>{[e.school, e.note].filter(Boolean).join("  |  ")}</Text>
              </View>
            ))}
          </>
        )}

        {c.languages.length > 0 && (
          <>
            <Text style={s.heading}>Language Skills</Text>
            <View style={s.gridHead} wrap={false}>
              <Text style={s.gridCellL}>Language</Text>
              <Text style={s.gridCell}>Level (CEFR)</Text>
            </View>
            {c.languages.map((lang, i) => (
              <View key={i} style={s.gridRow} wrap={false}>
                <Text style={s.gridCellL}>{lang.name}</Text>
                <Text style={s.gridCell}>{lang.level}</Text>
              </View>
            ))}
          </>
        )}

        {c.skills.length > 0 && (
          <>
            <Text style={s.heading}>Digital and Professional Skills</Text>
            {c.skills.map((g, i) => <KV key={i} k={g.label} v={g.items} />)}
          </>
        )}

        {c.certifications.length > 0 && (
          <>
            <Text style={s.heading}>Certifications</Text>
            {c.certifications.map((item, i) => (
              <View key={i} style={s.bulletRow} wrap={false}>
                <Text style={s.glyph}>•</Text>
                <Text style={s.bulletText}>{item}</Text>
              </View>
            ))}
          </>
        )}

        <Text
          style={{ position: "absolute", bottom: 20, left: 42, right: 42, textAlign: "center", fontSize: pt(15), color: "#888" }}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")}
          fixed
        />
      </Page>
    </Document>
  );
}
