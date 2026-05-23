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
  photo?: string;
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
  photo: "",
};

export const DUMMY_CV: CVData = {
  name: "Alex Morgan",
  title: "Senior Software Engineer",
  email: "alex.morgan@example.com",
  phone: "+44 7700 900123",
  location: "London, United Kingdom",
  linkedin: "linkedin.com/in/alexmorgan",
  website: "alexmorgan.dev",
  summary: "Results-driven Software Engineer with 7+ years building scalable web applications and leading cross-functional teams. Proven track record in full-stack development, system architecture, and delivering high-impact products. Passionate about clean code, mentorship, and continuous improvement.",
  experience: "Senior Software Engineer · TechCorp Ltd · 2021 – Present\n• Led development of a microservices platform handling 50,000+ daily active users\n• Reduced API response time by 40% through Redis caching and query optimisation\n• Mentored 5 junior engineers and ran weekly code reviews and sprint planning\n\nSoftware Engineer · StartupHub · 2018 – 2021\n• Built and maintained a React/Node.js SaaS product used by 200+ companies\n• Integrated Stripe and PayPal payment systems, processing £2M+ monthly\n• Improved test coverage from 40% to 85%, reducing production incidents by 60%\n\nJunior Developer · Digital Agency Co. · 2016 – 2018\n• Developed client websites and web apps using React, PHP, and MySQL\n• Collaborated with design team to implement pixel-perfect UIs",
  education: "MSc Computer Science · University of London · 2014 – 2016\nDissertation: Distributed Caching Strategies for High-Traffic APIs\n\nBSc Software Engineering · Manchester Metropolitan University · 2011 – 2014\nFirst Class Honours",
  skills: "TypeScript, JavaScript, React, Node.js, Python, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS (EC2, S3, Lambda), CI/CD, Git, REST APIs, GraphQL",
  languages: "English (Native), Spanish (B2), French (A2)",
  photo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='110'%3E%3Crect width='90' height='110' fill='%23cbd5e1'/%3E%3Ccircle cx='45' cy='38' r='19' fill='%2364748b'/%3E%3Cellipse cx='45' cy='85' rx='30' ry='22' fill='%2364748b'/%3E%3C/svg%3E",
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

function photoBox(photo: string | undefined, w: string, h: string): string {
  const src = photo?.trim();
  if (src) return `<img src="${src}" style="width:${w};height:${h};object-fit:cover;display:block" />`;
  return `<div style="width:${w};height:${h};background:#cbd5e1;border:1pt dashed #94a3b8"></div>`;
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

  const photoW = compact ? "60pt" : "78pt";
  const photoH = compact ? "72pt" : "94pt";

  return wrap(`
<div style="font-family:${font};max-width:680px;margin:auto">
  <table style="width:100%;border-collapse:collapse;background:${color};margin-bottom:${compact ? "6pt" : "12pt"}">
  <tr>
    <td style="padding:${compact ? "10pt" : "16pt"} 10pt ${compact ? "10pt" : "16pt"} 16pt;vertical-align:middle;width:${compact ? "74pt" : "94pt"}">
      ${photoBox(cv.photo, photoW, photoH)}
    </td>
    <td style="padding:${compact ? "10pt" : "16pt"} 16pt ${compact ? "10pt" : "16pt"} 6pt;vertical-align:middle;color:#fff">
      <h1 style="font-size:${compact ? "15pt" : "19pt"};margin-bottom:3pt;color:#fff">${cv.name || "Your Name"}</h1>
      <p style="font-size:10pt;opacity:0.85;margin-bottom:0;color:#fff">${cv.title || "Professional Title"}</p>
    </td>
  </tr>
  </table>
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
    <div style="margin-bottom:12pt">${photoBox(cv.photo, "70pt", "84pt")}</div>
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
  <table style="width:100%;border-collapse:collapse;background:${sidebar};margin-bottom:16pt">
  <tr>
    <td style="padding:20pt 10pt 20pt 18pt;vertical-align:top;width:92pt">
      ${photoBox(cv.photo, "76pt", "92pt")}
    </td>
    <td style="padding:20pt 18pt 20pt 4pt;vertical-align:middle;color:#fff">
      <h1 style="font-size:22pt;margin-bottom:4pt;color:#fff">${cv.name || "Your Name"}</h1>
      <p style="font-size:11pt;color:${accent};margin-bottom:8pt">${cv.title || "Professional Title"}</p>
      <p style="font-size:9pt;color:#9ca3af">${contactLine(cv)}</p>
    </td>
  </tr>
  </table>
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
  <table style="width:100%;border-collapse:collapse;margin-bottom:18pt">
  <tr>
    <td style="border-left:4pt solid ${accent};padding-left:14pt;vertical-align:top">
      <h1 style="font-size:20pt;margin-bottom:3pt;color:#111">${cv.name || "Your Name"}</h1>
      <p style="font-size:11pt;color:${accent};margin-bottom:6pt">${cv.title || "Professional Title"}</p>
      <p style="font-size:9pt;color:#555">${contactLine(cv)}</p>
    </td>
    <td style="vertical-align:top;width:88pt;padding-left:14pt;text-align:right">
      ${photoBox(cv.photo, "76pt", "92pt")}
    </td>
  </tr>
  </table>
  ${designSection("Professional Summary", lines(cv.summary), accent)}
  ${designSection("Work Experience", lines(cv.experience), accent)}
  ${designSection("Education", lines(cv.education), accent)}
  ${designSection("Skills", `<p style="margin:0">${cv.skills || "—"}</p>`, accent)}
  ${cv.languages ? designSection("Languages", `<p style="margin:0">${cv.languages}</p>`, accent) : ""}
</div>`, font);
}

// ── public API ─────────────────────────────────────────────────────────────

const TAB_LABELS: Record<TabKey, string> = {
  ats: "ATS Friendly",
  europass: "Europass",
  designer: "Designer",
};

const TEMPLATE_NAMES: Record<TabKey, string[]> = {
  ats: ["Classic ATS", "Modern ATS", "Executive ATS"],
  europass: ["Official EU", "Euro Modern", "Euro Compact"],
  designer: ["Creative Sidebar", "Bold Header", "Minimal Accent"],
};

export function getCVHTML(cv: CVData, tab: TabKey, templateIdx: number): string {
  if (tab === "ats") return buildATS(cv, templateIdx);
  if (tab === "europass") return buildEuropass(cv, templateIdx);
  return buildDesigner(cv, templateIdx);
}

export function downloadAsWord(cv: CVData, tab: TabKey, templateIdx: number) {
  const html = getCVHTML(cv, tab, templateIdx);

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const filename = `${TAB_LABELS[tab]}_${TEMPLATE_NAMES[tab][templateIdx]}_${dd}_${mm}_${yyyy}.doc`;

  const blob = new Blob(["﻿", html], {
    type: "application/vnd.ms-word;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── App-scoped document generation ─────────────────────────────────────────

export type AppInfo = {
  companyName: string;
  jobTitle: string;
  location?: string;
  notes?: string;
  jobPostUrl?: string;
};

export type DocType = "cv" | "resume" | "cover-letter";

function safeFilename(s: string) {
  return s.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
}

function docTypeLabel(dt: DocType) {
  return dt === "cv" ? "CV" : dt === "resume" ? "Resume" : "Cover_Letter";
}

function buildAppCoverLetter(info: AppInfo, cv: CVData): string {
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const topSkills = cv.skills
    ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4).join(", ")
    : "relevant technologies";

  const notesBlock = info.notes
    ? `<p style="margin-bottom:12pt;color:#555;font-style:italic;font-size:9.5pt">Role context: ${info.notes.replace(/\n/g, " ")}</p>`
    : "";

  return wrap(`
<div style="font-family:Calibri,Arial,sans-serif;max-width:620px;margin:auto;padding:36pt;font-size:11pt;line-height:1.75;color:#1a1a1a">
  <p style="margin-bottom:22pt">${dateStr}</p>
  <p style="margin-bottom:3pt">Hiring Manager</p>
  <p style="margin-bottom:3pt;font-weight:bold">${info.companyName}</p>
  ${info.location ? `<p style="margin-bottom:3pt">${info.location}</p>` : ""}
  <p style="margin-bottom:20pt"> </p>
  <p style="margin-bottom:18pt"><strong>Re: Application for ${info.jobTitle}</strong></p>
  <p style="margin-bottom:12pt">Dear Hiring Manager,</p>
  <p style="margin-bottom:12pt">I am writing to express my strong interest in the <strong>${info.jobTitle}</strong> position at <strong>${info.companyName}</strong>. With my background as ${cv.title || "a dedicated professional"}, I am confident that my skills and experience make me a strong candidate for this role.</p>
  ${notesBlock}
  <p style="margin-bottom:12pt">Throughout my career I have developed expertise in ${topSkills}, which aligns directly with the requirements of this position. I am particularly drawn to ${info.companyName} because of its reputation for excellence, and I am eager to bring my experience in ${cv.title || "my field"} to help your team achieve its goals.</p>
  <p style="margin-bottom:12pt">I would welcome the opportunity to discuss how my background and skills can contribute to ${info.companyName}'s continued success. My CV is attached for your consideration, and I am available for an interview at your earliest convenience.</p>
  <p style="margin-bottom:12pt">Thank you for your time and consideration. I look forward to hearing from you.</p>
  <p style="margin-bottom:4pt">Yours sincerely,</p>
  <p style="margin-bottom:4pt"> </p>
  <p style="font-weight:bold;margin-bottom:2pt">${cv.name || "Your Name"}</p>
  ${cv.email ? `<p style="font-size:9.5pt;color:#555;margin-bottom:1pt">${cv.email}</p>` : ""}
  ${cv.phone ? `<p style="font-size:9.5pt;color:#555;margin-bottom:1pt">${cv.phone}</p>` : ""}
  ${cv.linkedin ? `<p style="font-size:9.5pt;color:#555;margin-bottom:1pt">${cv.linkedin}</p>` : ""}
</div>`, "Calibri,Arial,sans-serif");
}

function buildAppResume(info: AppInfo, cv: CVData): string {
  const accent = "#6d28d9";
  const font = "Calibri,Arial,sans-serif";
  return wrap(`
<div style="font-family:${font};max-width:680px;margin:auto">
  <div style="background:${accent};padding:18pt 22pt;color:#fff">
    <h1 style="font-size:20pt;margin:0 0 4pt">${cv.name || "Your Name"}</h1>
    <p style="font-size:11pt;margin:0 0 6pt;opacity:0.9">${cv.title || "Professional"}</p>
    <p style="font-size:9pt;opacity:0.8">${contactLine(cv)}</p>
  </div>
  <div style="padding:14pt 22pt">
    <div style="margin-bottom:12pt;padding:7pt 12pt;background:#f5f3ff;border-radius:4pt;font-size:9.5pt;color:${accent}">
      Tailored for: <strong>${info.jobTitle}</strong> at <strong>${info.companyName}</strong>${info.location ? ` · ${info.location}` : ""}
    </div>
    ${cv.summary ? atsSection("Professional Summary", lines(cv.summary), accent, "leftbar") : ""}
    ${cv.experience ? atsSection("Work Experience", lines(cv.experience), accent, "leftbar") : ""}
    ${cv.skills ? atsSection("Core Skills", `<p style="margin:0">${cv.skills}</p>`, accent, "leftbar") : ""}
    ${cv.education ? atsSection("Education", lines(cv.education), accent, "leftbar") : ""}
    ${cv.languages ? atsSection("Languages", `<p style="margin:0">${cv.languages}</p>`, accent, "leftbar") : ""}
  </div>
</div>`, font);
}

export function getAppDocHTML(info: AppInfo, cv: CVData, docType: DocType): string {
  if (docType === "cover-letter") return buildAppCoverLetter(info, cv);
  if (docType === "resume") return buildAppResume(info, cv);
  return buildATS(cv, 0);
}

function openBlobInTab(html: string, forPrint = false): void {
  const content = forPrint
    ? html.replace("</body>", `<script>window.addEventListener('load',function(){window.print();});<\/script></body>`)
    : html;
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

function triggerDocBlob(html: string, filename: string): void {
  const blob = new Blob(["﻿", html], { type: "application/vnd.ms-word;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadAppDocument(info: AppInfo, cv: CVData, docType: DocType, format: "doc" | "pdf"): void {
  const html = getAppDocHTML(info, cv, docType);
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const base = `${safeFilename(info.companyName)}_${safeFilename(info.jobTitle)}_${docTypeLabel(docType)}_${dd}_${mm}_${yyyy}`;

  if (format === "pdf") {
    openBlobInTab(html, true);
    return;
  }
  triggerDocBlob(html, `${base}.doc`);
}

export function previewAppDocument(info: AppInfo, cv: CVData, docType: DocType): void {
  openBlobInTab(getAppDocHTML(info, cv, docType));
}
