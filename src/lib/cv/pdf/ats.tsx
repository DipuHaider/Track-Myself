import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { CVContent, CVVariant } from "@/types/cv";
import { contactLine, effectiveSkills, effectiveSummary, linkLine } from "@/lib/cv/content";
import { base, pt } from "./shared";

/* Mirrors src/lib/cv/docx/ats.ts — same section order, same compact trimming, so the
   PDF and the .docx are the same document in two containers. Keep them in step. */
const COMPACT_BULLETS = [4, 3, 2, 2, 1, 1, 2, 1, 2, 1];

function Heading({ children }: { children: string }) {
  return <Text style={base.heading}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={base.bulletRow} wrap={false}>
      <Text style={base.bulletGlyph}>•</Text>
      <Text style={base.bulletText}>{children}</Text>
    </View>
  );
}

export function ATSDocument({
  content: c,
  variant = "full",
  tailoredFor = "",
}: {
  content: CVContent;
  variant?: CVVariant;
  tailoredFor?: string;
}) {
  const compact = variant === "compact";
  const summary = effectiveSummary(c, variant);
  const skills = effectiveSkills(c, variant);
  const certs = compact ? c.certifications.slice(0, 4) : c.certifications;
  const gap = compact ? 8 : 12;

  return (
    <Document
      title={`${c.name || "CV"} — CV`}
      author={c.name || "TrackMyself"}
      subject={c.summaryShort || c.summary}
      creator="TrackMyself"
      producer="TrackMyself"
    >
      <Page size="A4" style={base.page}>
        <Text style={base.name}>{(c.name || "Your Name").toUpperCase()}</Text>
        {Boolean(c.positioning) && <Text style={base.positioning}>{c.positioning}</Text>}
        <Text style={base.contact}>{contactLine(c)}</Text>
        {Boolean(linkLine(c)) && <Text style={base.links}>{linkLine(c)}</Text>}
        {Boolean(tailoredFor) && <Text style={base.tailored}>{tailoredFor}</Text>}

        {Boolean(summary || c.availability) && (
          <View style={{ marginTop: gap }}>
            <Heading>Professional Summary</Heading>
            {Boolean(summary) && <Text>{summary}</Text>}
            {Boolean(c.availability) && (
              <Text style={{ fontFamily: "Helvetica-Oblique" }}>{c.availability}</Text>
            )}
          </View>
        )}

        {skills.length > 0 && (
          <View style={{ marginTop: gap }}>
            <Heading>Technical Skills</Heading>
            {skills.map((group, i) => (
              <Text key={i} style={base.skillRow}>
                {Boolean(group.label) && <Text style={base.label}>{group.label}: </Text>}
                <Text>{group.items}</Text>
              </Text>
            ))}
          </View>
        )}

        {c.experience.length > 0 && (
          <View style={{ marginTop: gap }}>
            <Heading>Professional Experience</Heading>
            {c.experience.map((job, i) => {
              const where = [job.company, job.location].filter(Boolean).join(", ");
              const meta = [job.dates, job.grade].filter(Boolean).join("  |  ");
              const shown = compact ? job.bullets.slice(0, COMPACT_BULLETS[i] ?? 1) : job.bullets;
              return (
                <View key={i} style={{ marginTop: compact ? 5 : 7 }} wrap={false}>
                  <Text style={base.jobTitle}>
                    {job.title}
                    {Boolean(where) && <Text style={{ fontFamily: "Helvetica" }}>{`  |  ${where}`}</Text>}
                  </Text>
                  {Boolean(meta) && <Text style={base.jobMeta}>{meta}</Text>}
                  {shown.map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                </View>
              );
            })}
          </View>
        )}

        {!compact && c.projects.length > 0 && (
          <View style={{ marginTop: gap }}>
            <Heading>Selected Projects</Heading>
            {c.projects.map((project, i) => (
              <View key={i} style={{ marginTop: 5 }} wrap={false}>
                <Text style={base.label}>{project.name}</Text>
                {Boolean(project.stack) && <Text style={base.jobMeta}>{project.stack}</Text>}
                {Boolean(project.text) && <Text>{project.text}</Text>}
              </View>
            ))}
          </View>
        )}

        {c.education.length > 0 && (
          <View style={{ marginTop: gap }}>
            <Heading>Education</Heading>
            {(compact ? c.education.slice(0, 1) : c.education).map((e, i) => {
              const line = [e.school, e.dates, e.note].filter(Boolean).join("  |  ");
              return (
                <View key={i} style={{ marginTop: 5 }} wrap={false}>
                  <Text style={base.label}>{e.degree}</Text>
                  {Boolean(line) && <Text>{line}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {certs.length > 0 && (
          <View style={{ marginTop: gap }}>
            <Heading>Certifications</Heading>
            {certs.map((item, i) => <Bullet key={i}>{item}</Bullet>)}
          </View>
        )}

        {c.awards.length > 0 && (
          <View style={{ marginTop: gap }}>
            <Heading>Awards</Heading>
            {c.awards.map((item, i) => <Bullet key={i}>{item}</Bullet>)}
          </View>
        )}

        {c.languages.length > 0 && (
          <View style={{ marginTop: gap }}>
            <Heading>Languages</Heading>
            {c.languages.map((lang, i) => (
              <Text key={i} style={base.skillRow}>
                <Text style={base.label}>{lang.name}: </Text>
                <Text>{lang.level}</Text>
              </Text>
            ))}
          </View>
        )}

        <Text
          style={base.footer}
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `${pageNumber} / ${totalPages}` : ""
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export const ATS_FONT_SIZE = pt(20);
