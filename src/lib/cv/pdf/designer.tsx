import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CVContent } from "@/types/cv";
import { contactLine, linkLine } from "@/lib/cv/content";
import { FONT, FONT_BOLD, FONT_ITALIC, pt } from "./shared";

/* Mirrors src/lib/cv/docx/designer.ts — same band, same sidebar, same accent. */
const BAND = "#111827";
const ACCENT = "#4F46E5";
const SIDE_INK = "#D1D5DB";
const SIDE_HEAD = "#A5B4FC";

const s = StyleSheet.create({
  page: { fontFamily: FONT, fontSize: pt(19), color: "#1a1a1a" },

  band: {
    backgroundColor: BAND,
    paddingVertical: 22,
    paddingHorizontal: 34,
    flexDirection: "row",
    alignItems: "center",
  },
  bandLeft: { flex: 1, paddingRight: 14 },
  name: { fontFamily: FONT_BOLD, fontSize: pt(34), color: "#FFFFFF", marginBottom: 3 },
  positioning: { fontSize: pt(23), color: "#C7D2FE", marginBottom: 6 },
  bandLine: { fontSize: pt(18), color: "#E5E7EB", marginBottom: 1 },
  photo: { width: 74, height: 92, objectFit: "cover" },

  body: { flexDirection: "row", flex: 1 },
  sidebar: { width: 168, backgroundColor: BAND, paddingTop: 20, paddingHorizontal: 18, paddingBottom: 26 },
  main: { flex: 1, paddingTop: 20, paddingHorizontal: 26, paddingBottom: 30 },

  sideHead: {
    fontFamily: FONT_BOLD, fontSize: pt(17), color: SIDE_HEAD,
    textTransform: "uppercase", marginBottom: 5, marginTop: 12,
  },
  sideLabel: { fontFamily: FONT_BOLD, fontSize: pt(17), color: "#FFFFFF" },
  sideText: { fontSize: pt(16), color: SIDE_INK, marginBottom: 6 },

  accentHead: {
    fontFamily: FONT_BOLD, fontSize: pt(22), color: ACCENT, textTransform: "uppercase",
    borderBottomWidth: 1.25, borderBottomColor: ACCENT, paddingBottom: 2,
    marginTop: 14, marginBottom: 6,
  },
  jobTitle: { fontFamily: FONT_BOLD, fontSize: pt(20) },
  jobMeta: { fontSize: pt(18), color: "#555555", fontFamily: FONT_ITALIC, marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  glyph: { width: 9, fontSize: pt(18), color: ACCENT },
  bulletText: { flex: 1, fontSize: pt(18) },
});

function Bullet({ children }: { children: string }) {
  return (
    <View style={s.bulletRow} wrap={false}>
      {/* Helvetica is a base-14 font in WinAnsi — U+25B8 is not in it and renders
          as a broken glyph. The bullet character is. */}
      <Text style={s.glyph}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export function DesignerDocument({ content: c }: { content: CVContent }) {
  const links = linkLine(c);

  return (
    <Document
      title={`${c.name || "CV"} — Designer CV`}
      author={c.name || "TrackMyself"}
      creator="TrackMyself"
      producer="TrackMyself"
    >
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed={false}>
          <View style={s.bandLeft}>
            <Text style={s.name}>{c.name || "Your Name"}</Text>
            {Boolean(c.positioning) && <Text style={s.positioning}>{c.positioning}</Text>}
            <Text style={s.bandLine}>{contactLine(c)}</Text>
            {Boolean(links) && <Text style={s.bandLine}>{links}</Text>}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is a PDF primitive, not an <img> */}
          {Boolean(c.photo) && <Image style={s.photo} src={c.photo} />}
        </View>

        <View style={s.body}>
          <View style={s.sidebar}>
            {c.skills.length > 0 && (
              <>
                <Text style={s.sideHead}>Skills</Text>
                {c.skills.map((group, i) => (
                  <View key={i}>
                    <Text style={s.sideLabel}>{group.label}</Text>
                    <Text style={s.sideText}>{group.items}</Text>
                  </View>
                ))}
              </>
            )}

            {c.languages.length > 0 && (
              <>
                <Text style={s.sideHead}>Languages</Text>
                {c.languages.map((lang, i) => (
                  <Text key={i} style={s.sideText}>
                    <Text style={s.sideLabel}>{lang.name}</Text>
                    {Boolean(lang.level) && <Text>{` — ${lang.level}`}</Text>}
                  </Text>
                ))}
              </>
            )}

            {c.certifications.length > 0 && (
              <>
                <Text style={s.sideHead}>Certifications</Text>
                {c.certifications.map((item, i) => (
                  <Text key={i} style={s.sideText}>{item}</Text>
                ))}
              </>
            )}

            {c.awards.length > 0 && (
              <>
                <Text style={s.sideHead}>Awards</Text>
                {c.awards.map((item, i) => (
                  <Text key={i} style={s.sideText}>{item}</Text>
                ))}
              </>
            )}
          </View>

          <View style={s.main}>
            {Boolean(c.summary) && (
              <>
                <Text style={s.accentHead}>Profile</Text>
                <Text>{c.summary}</Text>
              </>
            )}

            {c.experience.length > 0 && (
              <>
                <Text style={s.accentHead}>Experience</Text>
                {c.experience.map((job, i) => {
                  const where = [job.company, job.location].filter(Boolean).join(", ");
                  const meta = [job.dates, job.grade].filter(Boolean).join("  |  ");
                  return (
                    <View key={i} style={{ marginBottom: 7 }} wrap={false}>
                      <Text style={s.jobTitle}>
                        {job.title}
                        {Boolean(where) && <Text style={{ fontFamily: FONT }}>{`  |  ${where}`}</Text>}
                      </Text>
                      {Boolean(meta) && <Text style={s.jobMeta}>{meta}</Text>}
                      {job.bullets.map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                    </View>
                  );
                })}
              </>
            )}

            {c.projects.length > 0 && (
              <>
                <Text style={s.accentHead}>Projects</Text>
                {c.projects.map((project, i) => (
                  <View key={i} style={{ marginBottom: 5 }} wrap={false}>
                    <Text style={s.jobTitle}>{project.name}</Text>
                    {Boolean(project.stack) && <Text style={s.jobMeta}>{project.stack}</Text>}
                    {Boolean(project.text) && <Text>{project.text}</Text>}
                  </View>
                ))}
              </>
            )}

            {c.education.length > 0 && (
              <>
                <Text style={s.accentHead}>Education</Text>
                {c.education.map((e, i) => {
                  const line = [e.school, e.dates, e.note].filter(Boolean).join("  |  ");
                  return (
                    <View key={i} style={{ marginBottom: 5 }} wrap={false}>
                      <Text style={s.jobTitle}>{e.degree}</Text>
                      {Boolean(line) && <Text style={s.jobMeta}>{line}</Text>}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
