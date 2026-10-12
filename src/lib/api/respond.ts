import { NextResponse } from "next/server";
import type { RateLimitResult } from "@/lib/rateLimit";

export function tooMany(gate: RateLimitResult, message = "Too many requests. Try again later.") {
  return NextResponse.json(
    { error: message, retryAfterSeconds: gate.retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(Math.max(1, gate.retryAfterSeconds)) } },
  );
}

export function badRequest(message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbidden(message = "Forbidden", extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status: 403 });
}
