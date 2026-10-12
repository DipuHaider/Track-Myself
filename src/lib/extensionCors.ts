const EXTENSION_ORIGIN = /^chrome-extension:\/\/([a-p]{32})$/;

export function allowedExtensionIds(): string[] {
  return (process.env.EXTENSION_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
}

/* The extension talks to the API from its background worker, whose Origin is
   chrome-extension://<id>, so the allowlist is the set of extension ids plus an
   optional explicit EXTENSION_ORIGIN. Outside production, with neither set, any
   origin is accepted so a freshly loaded unpacked build just works. */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const ids = allowedExtensionIds();
  const explicit = (process.env.EXTENSION_ORIGIN ?? "").trim();
  const permissive = process.env.NODE_ENV !== "production" && !ids.length && !explicit;

  const match = origin.match(EXTENSION_ORIGIN);
  const allowed =
    (match && ids.includes(match[1])) ||
    (explicit && origin === explicit) ||
    permissive;

  if (!allowed) return { Vary: "Origin" };

  return {
    "Access-Control-Allow-Origin": permissive && !origin ? "*" : origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function withCors<T extends Response>(req: Request, res: T): T {
  for (const [k, v] of Object.entries(corsHeadersFor(req))) res.headers.set(k, v);
  return res;
}
