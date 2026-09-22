import type { IssueMail, MailResult } from "./types";

const ENDPOINT = "https://api.web3forms.com/submit";
const TIMEOUT_MS = 8000;
const ATTEMPTS = 3;
const BACKOFF_MS = [0, 1000, 3000];

/* Prefer the unprefixed name: NEXT_PUBLIC_* is inlined at build time, so a key
   added or rotated after the build is invisible to the running server. */
function accessKey() {
  return (process.env.WEB3FORMS_ACCESS_KEY || process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "").trim();
}

export function web3formsConfigured() {
  return Boolean(accessKey());
}

type Verdict = { done: true; result: MailResult } | { done: false; error: string };

/* Web3Forms throttles hard — one rejected submission can lock the key out for an
   hour, and hammering past that trips the Cloudflare challenge in front of the
   API. So only transport failures and 5xx are worth another attempt; every 4xx
   is either permanent or a throttle that retrying would only deepen. */
function classify(status: number, raw: string): Verdict {
  let data: { success?: boolean; message?: string } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  if (status === 200 && data?.success) return { done: true, result: { ok: true } };

  const challenged = raw.startsWith("<") || raw.includes("Just a moment");
  if (challenged) {
    return {
      done: true,
      result: {
        ok: false,
        retryable: true,
        error: `Cloudflare challenged the request (HTTP ${status}) — the key has been sending too often. Wait an hour, then resend.`,
      },
    };
  }

  const message = data?.message?.trim();

  if (status === 429 || (message && /rate limit/i.test(message))) {
    return {
      done: true,
      result: {
        ok: false,
        retryable: true,
        error: message || "Rate limited by Web3Forms. Wait an hour, then resend.",
      },
    };
  }

  if (status >= 500) return { done: false, error: message || `Web3Forms responded ${status}` };

  return {
    done: true,
    result: { ok: false, retryable: false, error: message || `Web3Forms responded ${status}` },
  };
}

export async function sendViaWeb3Forms(issue: IssueMail): Promise<MailResult> {
  const key = accessKey();
  if (!key) {
    return { ok: false, retryable: false, error: "WEB3FORMS_ACCESS_KEY is not set" };
  }

  const payload = JSON.stringify({
    access_key: key,
    subject: `[TrackMyself] ${issue.category} reported by ${issue.reporterName}`,
    from_name: "TrackMyself",
    replyto: issue.reporterEmail || undefined,
    botcheck: "",
    "Reported by": `${issue.reporterName} <${issue.reporterEmail || "no email"}>`,
    Role: issue.reporterRole,
    Category: issue.category,
    Page: issue.url || "—",
    Viewport: issue.viewport || "—",
    Browser: issue.userAgent || "—",
    "Report ID": issue.reportId,
    message: issue.message,
  });

  let lastError = "Could not reach Web3Forms";

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt]) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "TrackMyself/1.0 (+https://trackmyself.app)",
        },
        signal: controller.signal,
        body: payload,
      });

      const verdict = classify(res.status, await res.text());
      if (verdict.done) return verdict.result;
      lastError = verdict.error;
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      lastError = aborted ? "Web3Forms timed out" : "Could not reach Web3Forms";
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, retryable: true, error: `${lastError} after ${ATTEMPTS} attempts` };
}
