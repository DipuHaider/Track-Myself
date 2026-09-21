const ENDPOINT = "https://api.web3forms.com/submit";
const TIMEOUT_MS = 8000;
const ATTEMPTS = 3;
const BACKOFF_MS = [0, 700, 1800];

export type IssueMail = {
  category: string;
  message: string;
  url: string;
  viewport: string;
  userAgent: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole: string;
  reportId: string;
};

export function web3formsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_WEB3FORMS_KEY);
}

export async function sendIssueMail(issue: IssueMail): Promise<{ ok: boolean; error?: string }> {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
  if (!accessKey) return { ok: false, error: "NEXT_PUBLIC_WEB3FORMS_KEY is not set" };

  const payload = JSON.stringify({
    access_key: accessKey,
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

      const raw = await res.text();
      let data: { success?: boolean; message?: string } | null = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }

      if (res.ok && data?.success) return { ok: true };

      lastError = data?.message
        ?? (raw.includes("Just a moment") || raw.startsWith("<")
          ? `Blocked by Web3Forms' bot protection (HTTP ${res.status})`
          : `Web3Forms responded ${res.status}`);
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      lastError = aborted ? "Web3Forms timed out" : "Could not reach Web3Forms";
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, error: `${lastError} after ${ATTEMPTS} attempts` };
}
