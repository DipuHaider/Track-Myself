type Bucket = { hits: number[]; blockedUntil: number };

const buckets = new Map<string, Bucket>();

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

export function checkRateLimit({
  key, limit, windowMs, blockMs = 0,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [], blockedUntil: 0 };

  if (bucket.blockedUntil > now) {
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    if (blockMs > 0) bucket.blockedUntil = now + blockMs;
    buckets.set(key, bucket);
    const wait = blockMs > 0 ? blockMs : windowMs - (now - bucket.hits[0]);
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil(wait / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.blockedUntil < now && b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
