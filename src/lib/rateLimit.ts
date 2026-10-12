export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  blockMs?: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/* Every limiter is DB-backed (rateLimitStore.ts) so the count survives
   serverless cold starts and is shared across instances. This file only keeps
   the option/result types and the client-IP helper. */
/* Vercel sets x-vercel-forwarded-for and x-real-ip from the connection it saw,
   which a client cannot forge. x-forwarded-for is only consulted after those,
   and even then its first hop is the client's own claim. */
export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const vercel = get("x-vercel-forwarded-for")?.split(",")[0].trim();
  if (vercel) return vercel;
  const real = get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || "unknown";
}

export function clientIp(req: Request) {
  return clientIpFromHeaders((name) => req.headers.get(name));
}
