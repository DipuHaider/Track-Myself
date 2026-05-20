export type TabKey = "ats" | "europass" | "designer";

export type CVData = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  languages: string;
};

export const DEFAULT_CV: CVData = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  website: "",
  summary: "",
  experience: "",
  education: "",
  skills: "",
  languages: "",
};

// ── helpers ────────────────────────────────────────────────────────────────

function contactLine(cv: CVData): string {
  return [cv.email, cv.phone, cv.location, cv.linkedin, cv.website]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");
}

function lines(text: string): string {
  if (!text.trim()) return "<p style='margin:0;color:#999'>—</p>";
  return text
    .split("\n")
    .map((l) => `<p style="margin:0 0 3pt 0">${l || "&nbsp;"}</p>`)
    .join("");
}

function wrap(body: string, fontFace: string): string {
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>CV</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
  @page { margin:0.75in; size:A4 portrait; }
  body { font-family:${fontFace}; font-size:10pt; color:#222; margin:0; padding:0; }
  p { margin:0; } h1,h2,h3 { font-weight:bold; margin:0; }
</style>
</head><body>${body}</body></html>`;
}

// ── ATS templates ──────────────────────────────────────────────────────────

function atsSection(title: string, body: string, accent: string, style: "underline" | "leftbar" | "caps"): string {
  const headStyle: Record<string, string> = {
    underline: `border-bottom:1.5pt solid #000;padding-bottom:2pt;color:#000`,
    leftbar: `border-left:3pt solid ${accent};padding-left:6pt;color:${accent}`,
    caps: `border-bottom:1pt solid #bbb;padding-bottom:2pt;color:#000;letter-spacing:1pt`,
  };
  return `<div style="margin-bottom:10pt">
  <h2 style="font-size:9pt;text-transform:uppercase;margin-bottom:4pt;${headStyle[style]}">${title}</h2>
  <div style="font-size:10pt">${body}</div>
</div>`;
}

function buildATS(cv: CVData, idx: number): string {
  const configs = [
    { font: "Calibri, Arial, sans-serif", accent: "#000", style: "underline" as const, align: "left" },
    { font: "Arial, sans-serif", accent: "#1a56db", style: "leftbar" as const, align: "left" },
    { font: "'Times New Roman', Georgia, serif", accent: "#333", style: "caps" as const, align: "center" },
  ];
  const { font, accent, style, align } = configs[idx];

  return wrap(`
<div style="font-family:${font};max-width:680px;margin:auto">
  <div style="text-align:${align};margin-bottom:12pt">
    <h1 style="font-size:18pt;margin-bottom:3pt;color:#000">${cv.name || "Your Name"}</h1>
    <p style="font-size:11pt;color:#555;margin-bottom:4pt">${cv.title || "Professional Title"}</p>
    <p style="font-size:9pt;color:#666">${contactLine(cv)}</p>
  </div>
  ${atsSection("Professional Summary", lines(cv.summary), accent, style)}
  ${atsSection("Work Experience", lines(cv.experience), accent, style)}
  ${atsSection("Education", lines(cv.education), accent, style)}
  ${atsSection("Skills", `<p style="margin:0">${cv.skills || "—"}</p>`, accent, style)}
  ${cv.languages ? atsSection("Languages", `<p style="margin:0">${cv.languages}</p>`, accent, style) : ""}
</div>`, font);
}

// ── Europass templates ─────────────────────────────────────────────────────

function euroSection(title: string, body: string, color: string): string {
  return `<div style="margin-bottom:12pt">
  <h2 style="font-size:8.5pt;text-transform:uppercase;letter-spacing:0.8pt;background:${color};color:#fff;padding:3pt 8pt;margin-bottom:5pt">${title}</h2>
  <div style="font-size:10pt;padding-left:4pt">${body}</div>
</div>`;
}

function buildEuropass(cv: CVData, idx: number): string {
  const colors = ["#003399", "#1a56db", "#00695c"];
  const color = colors[idx];
  const font = "Calibri, Arial, sans-serif";
  const compact = idx === 2;

  return wrap(`
<div style="font-family:${font};max-width:680px;margin:auto">
  <div style="background:${color};color:#fff;padding:${compact ? "10pt" : "16pt"} 16pt;margin-bottom:${compact ? "6pt" : "12pt"}">
    <h1 style="font-size:${compact ? "15pt" : "19pt"};margin-bottom:3pt">${cv.name || "Your Name"}</h1>
    <p style="font-size:10pt;opacity:0.85;margin-bottom:0">${cv.title || "Professional Title"}</p>
  </div>
  <div style="background:${color}22;padding:5pt 16pt;margin-bottom:${compact ? "8pt" : "14pt"};font-size:9pt;color:#333">
    ${contactLine(cv)}
  </div>
  ${euroSection("Personal Statement", lines(cv.summary), color)}
  ${euroSection("Work Experience", lines(cv.experience), color)}
  ${euroSection("Education and Training", lines(cv.education), color)}
  ${euroSection("Skills", `<p style="margin:0">${cv.skills || "—"}</p>`, color)}
  ${euroSection("Language Skills", `<p style="margin:0">${cv.languages || "English (Native)"}</p>`, color)}
</div>`, font);
}

// ── Designer templates ─────────────────────────────────────────────────────

function designSection(title: string, body: string, accent: string): string {
  return `<div style="margin-bottom:12pt">
  <h2 style="font-size:8.5pt;font-weight:bold;color:${accent};text-transform:uppercase;letter-spacing:1pt;border-bottom:1pt solid ${accent};padding-bottom:2pt;margin-bottom:5pt">${title}</h2>
  <div style="font-size:10pt">${body}</div>
</div>`;
}

function buildDesigner(cv: CVData, idx: number): string {
  const font = "Calibri, 'Segoe UI', Arial, sans-serif";
  const cfgs = [
    { sidebar: "#1e293b", accent: "#818cf8" },
    { sidebar: "#111827", accent: "#10b981" },
    { sidebar: "#1a1a2e", accent: "#f472b6" },
  ];
  const { sidebar, accent } = cfgs[idx];

  if (idx === 0) {
    // Two-column sidebar layout
    return wrap(`
<table style="width:100%;border-collapse:collapse;font-family:${font}">
<tr>
  <td style="width:34%;background:${sidebar};color:#fff;padding:18pt 12pt;vertical-align:top">
    <h1 style="font-size:14pt;margin-bottom:3pt;color:#fff">${cv.name || "Your Name"}</h1>
    <p style="font-size:9pt;color:${accent};margin-bottom:14pt">${cv.title || "Professional Title"}</p>
    <p style="font-size:8pt;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8pt;margin-bottom:4pt">Contact</p>
    <p style="font-size:8.5pt;color:#cbd5e1;margin-bottom:14pt">${[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join("<br>")}</p>
    <p style="font-size:8pt;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8pt;margin-bottom:4pt">Skills</p>
    <p style="font-size:9pt;color:#cbd5e1;margin-bottom:14pt">${cv.skills || "—"}</p>
    ${cv.languages ? `<p style="font-size:8pt;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8pt;margin-bottom:4pt">Languages</p><p style="font-size:9pt;color:#cbd5e1">${cv.languages}</p>` : ""}
  </td>
  <td style="padding:18pt 16pt;vertical-align:top;background:#fff">
    ${designSection("Professional Summary", lines(cv.summary), accent)}
    ${designSection("Work Experience", lines(cv.experience), accent)}
    ${designSection("Education", lines(cv.education), accent)}
  </td>
</tr>
</table>`, font);
  }

  if (idx === 1) {
    // Bold full-width header
    return wrap(`
<div style="font-family:${font};max-width:680px;margin:auto">
  <div style="background:${sidebar};color:#fff;padding:20pt 18pt;margin-bottom:16pt">
    <h1 style="font-size:22pt;margin-bottom:4pt">${cv.name || "Your Name"}</h1>
    <p style="font-size:11pt;color:${accent};margin-bottom:8pt">${cv.title || "Professional Title"}</p>
    <p style="font-size:9pt;color:#9ca3af">${contactLine(cv)}</p>
  </div>
  ${designSection("Professional Summary", lines(cv.summary), accent)}
  ${designSection("Work Experience", lines(cv.experience), accent)}
  ${designSection("Education", lines(cv.education), accent)}
  ${designSection("Skills", `<p style="margin:0">${cv.skills || "—"}</p>`, accent)}
  ${cv.languages ? designSection("Languages", `<p style="margin:0">${cv.languages}</p>`, accent) : ""}
</div>`, font);
  }

  // Minimal accent border (idx === 2)
  return wrap(`
<div style="font-family:${font};max-width:680px;margin:auto">
  <div style="border-left:4pt solid ${accent};padding-left:14pt;margin-bottom:18pt">
    <h1 style="font-size:20pt;margin-bottom:3pt;color:#111">${cv.name || "Your Name"}</h1>
    <p style="font-size:11pt;color:${accent};margin-bottom:6pt">${cv.title || "Professional Title"}</p>
    <p style="font-size:9pt;color:#555">${contactLine(cv)}</p>
  </div>
  ${designSection("Professional Summary", lines(cv.summary), accent)}
  ${designSection("Work Experience", lines(cv.experience), accent)}
  ${designSection("Education", lines(cv.education), accent)}
  ${designSection("Skills", `<p style="margin:0">${cv.skills || "—"}</p>`, accent)}
  ${cv.languages ? designSection("Languages", `<p style="margin:0">${cv.languages}</p>`, accent) : ""}
</div>`, font);
}

// ── public API ─────────────────────────────────────────────────────────────

export function downloadAsWord(cv: CVData, tab: TabKey, templateIdx: number) {
  let html: string;
  if (tab === "ats") html = buildATS(cv, templateIdx);
  else if (tab === "europass") html = buildEuropass(cv, templateIdx);
  else html = buildDesigner(cv, templateIdx);

  const blob = new Blob(["﻿", html], {
    type: "application/vnd.ms-word;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(cv.name || "CV").replace(/\s+/g, "_")}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
