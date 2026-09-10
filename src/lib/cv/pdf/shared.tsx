import { StyleSheet } from "@react-pdf/renderer";

/* Helvetica is one of the 14 PDF base fonts, so nothing is embedded and the file
   stays small. It is also metrically close to the Calibri the .docx builders use,
   which keeps the two outputs looking like the same document. */
export const FONT = "Helvetica";
export const FONT_BOLD = "Helvetica-Bold";
export const FONT_ITALIC = "Helvetica-Oblique";

export const INK = "#1a1a1a";
export const MUTED = "#444444";
export const RULE = "#444444";

/* docx half-points → PDF points */
export const pt = (halfPoints: number) => halfPoints / 2;

export const base = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 46,
    paddingHorizontal: 46,
    fontFamily: FONT,
    fontSize: pt(20),
    color: INK,
    lineHeight: 1.35,
  },
  name: { fontFamily: FONT_BOLD, fontSize: pt(36), marginBottom: 2 },
  positioning: { fontSize: pt(24), color: MUTED, marginBottom: 4 },
  contact: { fontSize: pt(19), marginBottom: 1 },
  links: { fontSize: pt(19), marginBottom: 8 },
  tailored: { fontSize: pt(19), color: MUTED, fontFamily: FONT_ITALIC, marginBottom: 6 },

  heading: {
    fontFamily: FONT_BOLD,
    fontSize: pt(24),
    color: INK,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
    paddingBottom: 2,
    marginBottom: 5,
  },

  jobTitle: { fontFamily: FONT_BOLD, fontSize: pt(21) },
  jobMeta: { fontSize: pt(19), color: MUTED, marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bulletGlyph: { width: 10, fontSize: pt(19) },
  bulletText: { flex: 1, fontSize: pt(19) },
  skillRow: { marginBottom: 2 },
  label: { fontFamily: FONT_BOLD },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 46,
    right: 46,
    textAlign: "center",
    fontSize: pt(16),
    color: "#888888",
  },
});
