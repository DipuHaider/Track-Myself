import { resendConfigured, sendPasswordResetViaResend, sendViaResend } from "./resend";
import { sendViaWeb3Forms, web3formsConfigured } from "./web3forms";
import type { PasswordReset } from "./templates";
import type { IssueMail, MailProvider, MailResult } from "./types";

export type { IssueMail, MailProvider, MailResult, PasswordReset };

/* Resend wins when it is configured: Web3Forms is a browser-form service whose
   throttle assumes a human at a keyboard, so a burst of real reports loses mail
   no matter how politely the server asks. Web3Forms stays as the fallback so
   deployments that only have the old key keep working. */
export function mailProvider(): MailProvider {
  if (resendConfigured()) return "resend";
  if (web3formsConfigured()) return "web3forms";
  return "none";
}

/* Web3Forms delivers to whichever inbox owns the access key, so it can only ever
   mail the team. Anything addressed to a user — a reset link above all — needs a
   real sender, and silently not sending one would strand the account. */
export function canMailUsers() {
  return resendConfigured();
}

export async function sendIssueMail(issue: IssueMail): Promise<MailResult> {
  const provider = mailProvider();

  if (provider === "none") {
    return {
      ok: false,
      retryable: false,
      error: "No mail provider configured — set RESEND_API_KEY and ISSUE_MAIL_TO",
    };
  }

  const result = provider === "resend" ? await sendViaResend(issue) : await sendViaWeb3Forms(issue);

  return result.ok ? result : { ...result, error: `[${provider}] ${result.error ?? "Send failed"}` };
}

export async function sendPasswordResetMail(to: string, reset: PasswordReset): Promise<MailResult> {
  if (!canMailUsers()) {
    return {
      ok: false,
      retryable: false,
      error: "Password reset needs RESEND_API_KEY — Web3Forms cannot mail arbitrary addresses",
    };
  }

  const result = await sendPasswordResetViaResend(to, reset);

  return result.ok ? result : { ...result, error: `[resend] ${result.error ?? "Send failed"}` };
}
