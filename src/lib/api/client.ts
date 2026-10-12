export class ApiError extends Error {
  status: number;
  code?: string;
  upgrade?: boolean;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    const b = body as { code?: string; upgrade?: boolean } | undefined;
    this.code = b?.code;
    this.upgrade = b?.upgrade;
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFrom(status: number, body: unknown): string {
  const b = body as { error?: unknown } | null;
  if (b && typeof b === "object" && typeof b.error === "string") return b.error;
  if (status === 401) return "Please sign in again.";
  if (status === 403) return "You do not have access to that.";
  if (status === 404) return "Not found.";
  if (status === 423) return "Your account is paused.";
  if (status === 429) return "Too many requests. Try again shortly.";
  return "Something went wrong. Please try again.";
}

/* One fetch for every SWR key: throws on any non-2xx so consumers see `error`
   instead of a silently-wrong payload. */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const body = await readBody(res);
  if (!res.ok) throw new ApiError(res.status, messageFrom(res.status, body), body);
  return body as T;
}

export async function apiFetch<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    credentials: "same-origin",
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = await readBody(res);
  if (!res.ok) throw new ApiError(res.status, messageFrom(res.status, body), body);
  return body as T;
}

export function filenameFrom(res: Response, fallback: string): string {
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadFile(url: string, init: RequestInit & { json?: unknown } = {}, fallback = "download"): Promise<string> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    credentials: "same-origin",
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    const body = await readBody(res);
    throw new ApiError(res.status, messageFrom(res.status, body), body);
  }
  const filename = filenameFrom(res, fallback);
  saveBlob(await res.blob(), filename);
  return filename;
}
