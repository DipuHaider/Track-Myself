import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, fetcher, filenameFrom } from "@/lib/api/client";

afterEach(() => vi.unstubAllGlobals());

describe("fetcher", () => {
  it("returns JSON on success and throws ApiError with the server message otherwise", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ a: 1 }), { status: 200 })));
    await expect(fetcher("/x")).resolves.toEqual({ a: 1 });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Nope", upgrade: true }), { status: 403 })));
    const err = (await fetcher("/x").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Nope");
    expect(err.upgrade).toBe(true);
  });

  it("falls back to a status message when the body has none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    await expect(apiFetch("/x", { method: "POST", json: { y: 1 } })).rejects.toMatchObject({ status: 429 });
  });
});

describe("filenameFrom", () => {
  it("reads quoted and encoded names", () => {
    expect(filenameFrom(new Response("", { headers: { "Content-Disposition": 'attachment; filename="a b.docx"' } }), "x")).toBe("a b.docx");
    expect(filenameFrom(new Response("", { headers: { "Content-Disposition": "attachment; filename*=UTF-8''c%20v.pdf" } }), "x")).toBe("c v.pdf");
    expect(filenameFrom(new Response(""), "fallback")).toBe("fallback");
  });
});
