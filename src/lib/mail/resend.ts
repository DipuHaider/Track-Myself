import { Resend } from "resend";
import { issueEmail, passwordResetEmail, type Composed, type PasswordReset } from "./templates";
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

async function deliver(to: string[], mail: Composed, opts: { replyTo?: string; refId?: string }): Promise<MailResult> {
  const key = apiKey();
  if (!key) return { ok: false, retryable: false, error: "RESEND_API_KEY is not set" };
  if (to.length === 0) return { ok: false, retryable: false, error: "No recipient address" };

  const client = new Resend(key);
  let lastError = "Could not reach Resend";

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt]) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));

    try {
      const { data, error } = await client.emails.send({
        from: fromAddress(),
        to,
        replyTo: opts.replyTo || undefined,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        headers: opts.refId ? { "X-Entity-Ref-ID": opts.refId } : undefined,
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

export async function sendViaResend(issue: IssueMail): Promise<MailResult> {
  const to = recipients();
  if (to.length === 0) return { ok: false, retryable: false, error: "ISSUE_MAIL_TO is not set" };

  return deliver(to, issueEmail(issue), { replyTo: issue.reporterEmail, refId: issue.reportId });
}

export async function sendPasswordResetViaResend(
  to: string,
  reset: PasswordReset,
): Promise<MailResult> {
  return deliver([to], passwordResetEmail(reset), {});
}
