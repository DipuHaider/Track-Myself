const ENDPOINT = "https://api.web3forms.com/submit";
const TIMEOUT_MS = 8000;

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
      body: JSON.stringify({
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
      }),
    });

    const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
    if (!res.ok || !data?.success) {
      return { ok: false, error: data?.message ?? `Web3Forms responded ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, error: aborted ? "Web3Forms timed out" : "Could not reach Web3Forms" };
  } finally {
    clearTimeout(timer);
  }
}
