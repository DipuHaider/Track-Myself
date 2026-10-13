import type { IssueMail } from "./types";

export type Composed = { subject: string; html: string; text: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(body: string) {
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px;color:#0f172a">${body}</div>`;
}

function issueRows(issue: IssueMail): [string, string][] {
  return [
    ["Reported by", `${issue.reporterName} <${issue.reporterEmail || "no email"}>`],
    ["Role", issue.reporterRole || "—"],
    ["Category", issue.category],
    ["Page", issue.url || "—"],
    ["Viewport", issue.viewport || "—"],
    ["Browser", issue.userAgent || "—"],
    ["Report ID", issue.reportId],
  ];
}

export function issueEmail(issue: IssueMail): Composed {
  const rows = issueRows(issue);

  const meta = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;font-size:13px;word-break:break-word">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return {
    subject: `[TrackMyself] ${issue.category} reported by ${issue.reporterName}`,
    text: `${rows.map(([l, v]) => `${l}: ${v}`).join("\n")}\n\n${issue.message}\n`,
    html: shell(
      `<h2 style="margin:0 0 4px;font-size:17px">${escapeHtml(issue.category)} report</h2>
<p style="margin:0 0 16px;color:#64748b;font-size:13px">via TrackMyself</p>
<table style="border-collapse:collapse;margin-bottom:16px">${meta}</table>
<div style="white-space:pre-wrap;border-left:3px solid #e2e8f0;padding:2px 0 2px 14px;font-size:14px;line-height:1.55">${escapeHtml(issue.message)}</div>`,
    ),
  };
}

export type PasswordReset = { name: string; resetUrl: string; expiresMinutes: number };
export type Verification = { name: string; verifyUrl: string; expiresHours: number };
export type Welcome = { name: string; portalUrl: string };

export function verificationEmail({ name, verifyUrl, expiresHours }: Verification): Composed {
  const safeUrl = escapeHtml(verifyUrl);
  return {
    subject: "Confirm your TrackMyself email",
    text:
      `Hi ${name},\n\n` +
      `Confirm this address to finish creating your TrackMyself account:\n${verifyUrl}\n\n` +
      `The link works once and expires in ${expiresHours} hours.\n\n` +
      `If you didn't sign up, ignore this email and nothing will happen.\n`,
    html: shell(
      `<h2 style="margin:0 0 12px;font-size:18px">Confirm your email</h2>
<p style="margin:0 0 18px;font-size:14px;line-height:1.55">Hi ${escapeHtml(name)}, one click and your TrackMyself account is ready.</p>
<p style="margin:0 0 20px">
  <a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px">Confirm email</a>
</p>
<p style="margin:0 0 6px;color:#64748b;font-size:12px">Or paste this into your browser:</p>
<p style="margin:0 0 20px;font-size:12px;word-break:break-all"><a href="${safeUrl}" style="color:#4f46e5">${safeUrl}</a></p>
<p style="margin:0 0 6px;color:#64748b;font-size:12px">The link works once and expires in ${expiresHours} hours.</p>
<p style="margin:0;color:#64748b;font-size:12px">If you didn't sign up, ignore this email and nothing will happen.</p>`,
    ),
  };
}

export function welcomeEmail({ name, portalUrl }: Welcome): Composed {
  const safeUrl = escapeHtml(portalUrl);
  return {
    subject: "Welcome to TrackMyself",
    text:
      `Hi ${name},\n\n` +
      `Your email is confirmed. Add your first application, upload a CV, and let the tracker do the remembering:\n${portalUrl}\n\n` +
      `Tip: the browser extension saves LinkedIn and Indeed jobs in one click.\n`,
    html: shell(
      `<h2 style="margin:0 0 12px;font-size:18px">You're in</h2>
<p style="margin:0 0 18px;font-size:14px;line-height:1.55">Hi ${escapeHtml(name)}, your email is confirmed. Add your first application, upload a CV, and let the tracker do the remembering.</p>
<p style="margin:0 0 20px">
  <a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px">Open TrackMyself</a>
</p>
<p style="margin:0;color:#64748b;font-size:12px">Tip: the browser extension saves LinkedIn and Indeed jobs in one click.</p>`,
    ),
  };
}

export function passwordResetEmail({ name, resetUrl, expiresMinutes }: PasswordReset): Composed {
  const safeUrl = escapeHtml(resetUrl);

  return {
    subject: "Reset your TrackMyself password",
    text:
      `Hi ${name},\n\n` +
      `Open this link to choose a new TrackMyself password:\n${resetUrl}\n\n` +
      `The link works once and expires in ${expiresMinutes} minutes.\n\n` +
      `If you didn't ask for this, ignore this email — your password stays as it is.\n`,
    html: shell(
      `<h2 style="margin:0 0 12px;font-size:18px">Reset your password</h2>
<p style="margin:0 0 18px;font-size:14px;line-height:1.55">Hi ${escapeHtml(name)}, choose a new password for your TrackMyself account.</p>
<p style="margin:0 0 20px">
  <a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px">Choose a new password</a>
</p>
<p style="margin:0 0 6px;color:#64748b;font-size:12px">Or paste this into your browser:</p>
<p style="margin:0 0 20px;font-size:12px;word-break:break-all"><a href="${safeUrl}" style="color:#4f46e5">${safeUrl}</a></p>
<p style="margin:0 0 6px;color:#64748b;font-size:12px">The link works once and expires in ${expiresMinutes} minutes.</p>
<p style="margin:0;color:#64748b;font-size:12px">If you didn't ask for this, ignore this email — your password stays as it is.</p>`,
    ),
  };
}

export type JobHuntReportMail = {
  name: string;
  date: string;
  summary: string[];
  newLeads: { company: string; title: string; platform: string; fitScore: number | null }[];
  ready: { company: string; title: string }[];
  deadlines: { company: string; title: string; deadline: string | null }[];
  suggestions: string[];
  reportUrl: string;
  inboxUrl: string;
  settingsUrl: string;
};

export function jobHuntReportEmail(r: JobHuntReportMail): Composed {
  const li = (items: string[]) =>
    items.length ? `<ul style="margin:4px 0 16px;padding-left:18px;font-size:14px;line-height:1.55">${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "";
  const section = (title: string, body: string) =>
    body ? `<h3 style="margin:16px 0 4px;font-size:14px">${escapeHtml(title)}</h3>${body}` : "";

  const leads = r.newLeads.map((l) =>
    `${escapeHtml(l.title)} — ${escapeHtml(l.company)} <span style="color:#64748b">(${escapeHtml(l.platform)}${l.fitScore != null ? `, fit ${l.fitScore}` : ""})</span>`);
  const ready = r.ready.map((l) => `${escapeHtml(l.title)} — ${escapeHtml(l.company)}`);
  const deadlines = r.deadlines.map((l) =>
    `${escapeHtml(l.title)} — ${escapeHtml(l.company)}${l.deadline ? ` <span style="color:#b45309">closes ${escapeHtml(l.deadline.slice(0, 10))}</span>` : ""}`);

  const text = [
    `Your job hunt, ${r.date}`,
    "",
    ...r.summary,
    "",
    r.newLeads.length ? "New jobs:" : "",
    ...r.newLeads.map((l) => `- ${l.title} — ${l.company} (${l.platform}${l.fitScore != null ? `, fit ${l.fitScore}` : ""})`),
    r.ready.length ? "\nReady for your review:" : "",
    ...r.ready.map((l) => `- ${l.title} — ${l.company}`),
    r.deadlines.length ? "\nClosing soon:" : "",
    ...r.deadlines.map((l) => `- ${l.title} — ${l.company}${l.deadline ? ` (closes ${l.deadline.slice(0, 10)})` : ""}`),
    r.suggestions.length ? "\nWhat the numbers say:" : "",
    ...r.suggestions.map((s) => `- ${s}`),
    "",
    `Full report: ${r.reportUrl}`,
    `Job inbox: ${r.inboxUrl}`,
    `Turn these emails off: ${r.settingsUrl}`,
  ].filter((l) => l !== "").join("\n");

  return {
    subject: `Your job hunt for ${r.date}: ${r.summary[0] ?? "daily report"}`,
    text,
    html: shell(
      `<h2 style="margin:0 0 4px;font-size:17px">Good morning${r.name ? `, ${escapeHtml(r.name.split(" ")[0])}` : ""}</h2>
<p style="margin:0 0 12px;color:#64748b;font-size:13px">Your TrackMyself job hunt for ${escapeHtml(r.date)}</p>
${li(r.summary.map(escapeHtml))}
${section("New jobs", li(leads))}
${section("Ready for your review", li(ready))}
${section("Closing soon", li(deadlines))}
${section("What the numbers say", li(r.suggestions.map(escapeHtml)))}
<p style="margin:20px 0"><a href="${escapeHtml(r.inboxUrl)}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Open the job inbox</a>
&nbsp; <a href="${escapeHtml(r.reportUrl)}" style="color:#4f46e5">Full report</a></p>
<p style="color:#94a3b8;font-size:12px">You get this because the daily report email is on. <a href="${escapeHtml(r.settingsUrl)}" style="color:#94a3b8">Turn it off</a>.</p>`,
    ),
  };
}
