import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CVContent } from "@/types/cv";
import { FONT, FONT_BOLD, FONT_ITALIC, pt } from "./shared";

/* Mirrors src/lib/cv/docx/lebenslauf.ts — the German tabular convention: a date
   column on the left, content on the right, photo top-right, signature line last. */
const s = StyleSheet.create({
  page: {
    paddingTop: 42, paddingBottom: 46, paddingHorizontal: 46,
    fontFamily: FONT, fontSize: pt(19), color: "#1a1a1a", lineHeight: 1.35,
  },
  header: { flexDirection: "row", marginBottom: 16 },
  headerLeft: { flex: 1, paddingRight: 16 },
  title: { fontFamily: FONT_BOLD, fontSize: pt(34), marginBottom: 4, letterSpacing: 1 },
  name: { fontFamily: FONT_BOLD, fontSize: pt(24), marginBottom: 2 },
  line: { fontSize: pt(19), color: "#333333" },
  photo: { width: 99, height: 128, objectFit: "cover" },

  heading: {
    fontFamily: FONT_BOLD, fontSize: pt(21), textTransform: "uppercase",
    borderBottomWidth: 0.75, borderBottomColor: "#2C3547", paddingBottom: 2,
    marginTop: 14, marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 5 },
  dates: { width: 108, fontSize: pt(18), color: "#444444", paddingRight: 8 },
  body: { flex: 1 },
  strong: { fontFamily: FONT_BOLD, fontSize: pt(19) },
  meta: { fontSize: pt(18), color: "#555555", fontFamily: FONT_ITALIC },
  bulletRow: { flexDirection: "row", marginBottom: 1 },
  glyph: { width: 9, fontSize: pt(18) },
  bulletText: { flex: 1, fontSize: pt(18) },
  signature: { marginTop: 30 },
  sigLine: { borderTopWidth: 0.75, borderTopColor: "#666", width: 190, marginTop: 26, paddingTop: 3, fontSize: pt(17), color: "#555" },
});

function Row({ dates, children }: { dates: string; children: React.ReactNode }) {
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.dates}>{dates}</Text>
      <View style={s.body}>{children}</View>
    </View>
  );
}

export function LebenslaufDocument({ content: c }: { content: CVContent }) {
  const city = c.signatureCity || c.contact.city.split(",")[0]?.trim() || "";
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const details: [string, string][] = [
    ["Anschrift", c.contact.addressFull || c.contact.city],
    ["Telefon", c.contact.phone],
    ["E-Mail", c.contact.email],
    ["Geburtsdatum", c.personal.dobLong || c.personal.dob],
    ["Staatsangehörigkeit", c.personal.nationality],
  ];

  return (
    <Document
      title={`${c.name || "CV"} — Lebenslauf`}
      author={c.name || "TrackMyself"}
      creator="TrackMyself"
      producer="TrackMyself"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.title}>LEBENSLAUF</Text>
            <Text style={s.name}>{c.name || "Ihr Name"}</Text>
            {Boolean(c.positioning) && <Text style={s.line}>{c.positioning}</Text>}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is a PDF primitive, not an <img> */}
          {Boolean(c.photo) && <Image style={s.photo} src={c.photo} />}
        </View>

        <Text style={s.heading}>Persönliche Daten</Text>
        {details.filter(([, v]) => v).map(([k, v]) => (
          <Row key={k} dates={k}>
            <Text>{v}</Text>
          </Row>
        ))}

        {c.experience.length > 0 && (
          <>
            <Text style={s.heading}>Berufserfahrung</Text>
            {c.experience.map((job, i) => (
              <Row key={i} dates={job.dates}>
                <Text style={s.strong}>{job.title}</Text>
                <Text style={s.meta}>{[job.company, job.location].filter(Boolean).join(", ")}</Text>
                {job.bullets.map((b, j) => (
                  <View key={j} style={s.bulletRow} wrap={false}>
                    <Text style={s.glyph}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </Row>
            ))}
          </>
        )}

        {c.education.length > 0 && (
          <>
            <Text style={s.heading}>Ausbildung</Text>
            {c.education.map((e, i) => (
              <Row key={i} dates={e.dates}>
                <Text style={s.strong}>{e.degree}</Text>
                <Text style={s.meta}>{[e.school, e.note].filter(Boolean).join(", ")}</Text>
              </Row>
            ))}
          </>
        )}

        {c.skills.length > 0 && (
          <>
            <Text style={s.heading}>Kenntnisse</Text>
            {c.skills.map((g, i) => (
              <Row key={i} dates={g.label}>
                <Text>{g.items}</Text>
              </Row>
            ))}
          </>
        )}

        {c.languages.length > 0 && (
          <>
            <Text style={s.heading}>Sprachen</Text>
            {c.languages.map((l, i) => (
              <Row key={i} dates={l.name}>
                <Text>{l.level}</Text>
              </Row>
            ))}
          </>
        )}

        <View style={s.signature} wrap={false}>
          <Text style={s.line}>{[city, today].filter(Boolean).join(", ")}</Text>
          <Text style={s.sigLine}>{c.name || ""}</Text>
        </View>
      </Page>
    </Document>
  );
}
