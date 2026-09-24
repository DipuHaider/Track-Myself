import dbConnect from "@/lib/db";
import RateBucket from "@/models/RateBucket";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rateLimit";

export type { RateLimitOptions, RateLimitResult };

/* The in-process limiter in rateLimit.ts holds a Map per lambda instance, so on
   a serverless host the real ceiling is the limit times however many instances
   are warm, and a cold start clears it. Routes where that matters — anything
   public, unauthenticated, or able to spend money — count here instead.

   Fixed window rather than sliding: the window start is part of the _id, so a
   window is created by its first hit and removed by its own TTL. A sliding
   window would need an array of timestamps per key, rewritten on every request
   and unbounded in length. */
function windowStartMs(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

export async function checkRateLimitDb({
  key,
  limit,
  windowMs,
  blockMs = 0,
}: RateLimitOptions): Promise<RateLimitResult> {
  await dbConnect();

  const now = Date.now();
  const startMs = windowStartMs(now, windowMs);
  const windowStart = new Date(startMs);
  const id = `${key}|${startMs}`;
  const expiresAt = new Date(startMs + windowMs + Math.max(blockMs, 0));

  try {
    const doc = (await RateBucket.findOneAndUpdate(
      { _id: id, count: { $lt: limit } },
      { $inc: { count: 1 }, $setOnInsert: { key, windowStart, expiresAt } },
      { upsert: true, returnDocument: "after" },
    ).lean()) as { count?: number } | null;

    const used = doc?.count ?? 1;
    return { ok: true, remaining: Math.max(0, limit - used), retryAfterSeconds: 0 };
  } catch (err) {
    /* A duplicate key here is the guard doing its job: the document exists and
       count was already at the limit, so the upsert could not create and the
       filter could not match. Anything else is a real failure. */
    if ((err as { code?: number }).code !== 11000) throw err;

    if (blockMs > 0) {
      await RateBucket.updateOne(
        { _id: id },
        { $set: { expiresAt: new Date(now + blockMs) } },
      ).catch(() => {});
    }

    const waitMs = blockMs > 0 ? blockMs : startMs + windowMs - now;
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil(waitMs / 1000) };
  }
}

export async function clearRateLimitDb(key: string): Promise<void> {
  await dbConnect();
  await RateBucket.deleteMany({ key }).catch(() => {});
}
