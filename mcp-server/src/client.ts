export class TrackMyselfError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type ClientConfig = { baseUrl: string; token: string };

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ClientConfig {
  const baseUrl = (env.TRACKMYSELF_URL ?? "https://trackmyself.webarden.tech").trim().replace(/\/+$/, "");
  const token = (env.TRACKMYSELF_TOKEN ?? "").trim();
  if (!token.startsWith("tm_pat_")) {
    throw new Error("Set TRACKMYSELF_TOKEN to a personal access token from TrackMyself → Settings → Integrations.");
  }
  if (!/^https:\/\//.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
    throw new Error("TRACKMYSELF_URL must be https (or http://localhost for development).");
  }
  return { baseUrl, token };
}

/* A thin wrapper over /api/v1. Every call carries the token; nothing here
   holds state or credentials beyond what the environment provides. */
export function createClient(cfg: ClientConfig, fetchImpl: typeof fetch = fetch) {
  async function call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const res = await fetchImpl(`${cfg.baseUrl}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(90_000),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text.slice(0, 300) };
    }
    if (!res.ok) {
      const msg = (data as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
      throw new TrackMyselfError(msg, res.status);
    }
    return data as T;
  }

  const qs = (params: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return {
    me: () => call("GET", "/me"),
    listLeads: (q: { status?: string; platform?: string; q?: string; sort?: string; minFit?: number; page?: number; limit?: number }) =>
      call("GET", `/leads${qs(q)}`),
    getLead: (id: string) => call("GET", `/leads/${encodeURIComponent(id)}`),
    leadAction: (id: string, action: "shortlist" | "dismiss" | "restore") =>
      call("PATCH", `/leads/${encodeURIComponent(id)}`, { action }),
    answerGaps: (id: string, answers: { requirement: string; answer: string }[]) =>
      call("PATCH", `/leads/${encodeURIComponent(id)}`, { action: "answers", answers }),
    prepareLead: (id: string) => call("POST", `/leads/${encodeURIComponent(id)}/prepare`, {}),
    addLeads: (source: string, leads: unknown[], idempotencyKey?: string) =>
      call("POST", "/leads", { source, leads }, idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    runHunt: () => call("POST", "/hunt/run", {}),
    report: (date?: string) => call("GET", `/report${qs({ date })}`),
    insights: (days?: number) => call("GET", `/insights${qs({ days })}`),
    listApplications: (q: { status?: string; page?: number; limit?: number }) => call("GET", `/applications${qs(q)}`),
    updateApplication: (id: string, patch: Record<string, unknown>) =>
      call("PATCH", `/applications/${encodeURIComponent(id)}`, patch),
  };
}

export type TrackMyselfClient = ReturnType<typeof createClient>;
