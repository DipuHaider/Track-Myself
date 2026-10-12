const CONTROL = /[\u0000-\u001f\u007f]/;

/* Only a same-origin path survives: anything with a scheme, an authority, a
   backslash trick like "/\evil.com" (which browsers read as "//evil.com") or
   control characters falls back to the portal. */
export function safeReturnTo(value: string | null | undefined, fallback = "/me"): string {
  if (!value || typeof value !== "string") return fallback;
  if (CONTROL.test(value)) return fallback;
  if (!value.startsWith("/") || /^\/[\/\\]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://trackmyself.invalid");
    if (url.origin !== "http://trackmyself.invalid") return fallback;
    const out = `${url.pathname}${url.search}${url.hash}`;
    return out.startsWith("/") && !/^\/[\/\\]/.test(out) ? out : fallback;
  } catch {
    return fallback;
  }
}
