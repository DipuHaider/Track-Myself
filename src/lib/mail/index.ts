import { resendConfigured, sendViaResend } from "./resend";
import { sendViaWeb3Forms, web3formsConfigured } from "./web3forms";
import type { IssueMail, MailProvider, MailResult } from "./types";

export type { IssueMail, MailProvider, MailResult };

/* Resend wins when it is configured: Web3Forms is a browser-form service whose
   throttle assumes a human at a keyboard, so a burst of real reports loses mail
   no matter how politely the server asks. Web3Forms stays as the fallback so
   deployments that only have the old key keep working. */
export function mailProvider(): MailProvider {
  if (resendConfigured()) return "resend";
  if (web3formsConfigured()) return "web3forms";
  return "none";
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
