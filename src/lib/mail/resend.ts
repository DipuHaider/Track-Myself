import { Resend } from "resend";
import type { IssueMail, MailResult } from "./types";

const ATTEMPTS = 3;
const BACKOFF_MS = [0, 1000, 3000];
const FROM_FALLBACK = "TrackMyself <onboarding@resend.dev>";

function apiKey() {
  return (process.env.RESEND_API_KEY ?? "").trim();
}

function fromAddress() {
  return (process.env.ISSUE_MAIL_FROM ?? "").trim() || FROM_FALLBACK;
}

function recipients() {
  return (process.env.ISSUE_MAIL_TO ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

/* Keyed on the API key alone. A deployment that sets the key but forgets
   ISSUE_MAIL_TO is half-migrated, and falling back to Web3Forms would hide that
   behind mail that mostly does not arrive — better to fail loudly in the panel. */
export function resendConfigured() {
  return Boolean(apiKey());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rows(issue: IssueMail): [string, string][] {
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

function textBody(issue: IssueMail) {
  const meta = rows(issue)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  return `${meta}\n\n${issue.message}\n`;
}

function htmlBody(issue: IssueMail) {
  const meta = rows(issue)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;font-size:13px;word-break:break-word">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px">
<h2 style="margin:0 0 4px;font-size:17px">${escapeHtml(issue.category)} report</h2>
<p style="margin:0 0 16px;color:#64748b;font-size:13px">via TrackMyself</p>
<table style="border-collapse:collapse;margin-bottom:16px">${meta}</table>
<div style="white-space:pre-wrap;border-left:3px solid #e2e8f0;padding:2px 0 2px 14px;font-size:14px;line-height:1.55">${escapeHtml(issue.message)}</div>
</div>`;
}

/* Resend surfaces failures as a typed error rather than throwing. Only throttling
   and upstream faults are worth another attempt; a rejected key or an unverified
   sender domain fails the same way every time, so retrying just delays the report. */
const PERMANENT = new Set([
  "validation_error",
  "invalid_api_key",
  "missing_api_key",
  "restricted_api_key",
  "invalid_from_address",
  "invalid_to_address",
  "not_found",
]);

export async function sendViaResend(issue: IssueMail): Promise<MailResult> {
  const key = apiKey();
  const to = recipients();

  if (!key) return { ok: false, retryable: false, error: "RESEND_API_KEY is not set" };
  if (to.length === 0) return { ok: false, retryable: false, error: "ISSUE_MAIL_TO is not set" };

  const client = new Resend(key);
  let lastError = "Could not reach Resend";

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt]) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));

    try {
      const { data, error } = await client.emails.send({
        from: fromAddress(),
        to,
        replyTo: issue.reporterEmail || undefined,
        subject: `[TrackMyself] ${issue.category} reported by ${issue.reporterName}`,
        text: textBody(issue),
        html: htmlBody(issue),
        headers: { "X-Entity-Ref-ID": issue.reportId },
      });

      if (data?.id) return { ok: true };

      const name = error?.name ?? "";
      const detail = error?.message?.trim() || name || "Resend rejected the message";

      if (PERMANENT.has(name)) return { ok: false, retryable: false, error: detail };
      if (name === "rate_limit_exceeded") return { ok: false, retryable: true, error: detail };

      lastError = detail;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Could not reach Resend";
    }
  }

  return { ok: false, retryable: true, error: `${lastError} after ${ATTEMPTS} attempts` };
}
