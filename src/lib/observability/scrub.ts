import type { ErrorEvent } from "@sentry/nextjs";

const MAX_STRING = 500;
const PRIVATE_PATHS = ["/api/user/cv", "/api/cv/", "/api/user/ai-key", "/api/applications", "/api/attachments"];
const SECRET_KEY = /aikey|password|ciphertext|token|secret|authorization|cookie/i;

function truncate(value: unknown): unknown {
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (Array.isArray(value)) return value.map(truncate);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? "[redacted]" : truncate(v);
    }
    return out;
  }
  return value;
}

/* Error reports must never carry a CV, an email address or a credential. The
   SDK is also told not to collect PII, but this runs on every event as the last
   word: request bodies, cookies and headers go, user identity is reduced to the
   id, and anything long or secret-looking in the extras is cut or redacted. */
export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
  }
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }
  if (event.extra) event.extra = truncate(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = truncate(event.contexts) as ErrorEvent["contexts"];
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.filter((b) => {
      const url = typeof b.data?.url === "string" ? b.data.url : "";
      return !(b.category === "fetch" || b.category === "xhr") || !PRIVATE_PATHS.some((p) => url.includes(p));
    });
  }
  return event;
}

export function sentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}
