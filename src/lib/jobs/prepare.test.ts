import { beforeEach, describe, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({
  lead: null as Record<string, unknown> | null,
  leadUpdates: [] as Record<string, unknown>[],
  createdApps: [] as Record<string, unknown>[],
  saved: [] as Record<string, unknown>[],
  entitled: true,
  tailorOk: true,
  resolveOk: true,
}));

vi.mock("@/lib/db", () => ({ default: async () => undefined }));
vi.mock("@/lib/jobs/events", () => ({ emitLeadReady: async () => undefined }));
vi.mock("@/models/JobLead", () => ({
  default: {
    findOne: () => ({ lean: async () => s.lead }),
    updateOne: async (_f: unknown, u: Record<string, unknown>) => { s.leadUpdates.push(u); return {}; },
  },
}));
vi.mock("@/models/Application", () => ({
  default: {
    exists: async () => null,
    create: async (doc: Record<string, unknown>) => { s.createdApps.push(doc); return { _id: "app1" }; },
  },
}));
vi.mock("@/lib/applicationHistory", () => ({
  historyActor: async () => ({ id: "u1", name: "U" }),
  initialHistory: () => [],
}));
vi.mock("@/lib/ai/userKey", () => ({ getUserCredential: async () => null }));
vi.mock("@/lib/ai/gateway", () => ({
  aiEntitlement: async () => (s.entitled
    ? { allowed: true, via: "premium", note: "" }
    : { allowed: false, reason: "upgrade", message: "Allowance used." }),
}));
vi.mock("@/lib/ai/jobFit", () => ({
  analyseJobFit: async () => ({ mode: "ai", note: "", items: [
    { requirement: "Kubernetes", excerpt: "", level: "required", verdict: "not-evidenced", evidence: [], suggestion: "", question: "Kubernetes?" },
    { requirement: "React", excerpt: "", level: "required", verdict: "match", evidence: [], suggestion: "", question: "" },
  ] }),
  keywordGaps: () => ({ mode: "keyword", note: "", items: [] }),
}));
vi.mock("@/lib/cv/generatePipeline", () => ({
  resolveGenerationContent: async () => (s.resolveOk
    ? { ok: true, content: { name: "U", summary: "s" }, profile: null }
    : { ok: false, status: 400, error: "Your CV is empty." }),
  isTooThinToPrint: () => false,
}));
vi.mock("@/lib/cv/ai/adapt", () => ({
  runTailor: async () => (s.tailorOk
    ? { ok: true, value: {}, provider: "anthropic", providerLabel: "Claude" }
    : { ok: false, kind: "upstream", error: "Upstream failed." }),
  applyTailorOutput: (c: unknown) => ({ content: c, changedFields: ["summary"] }),
  JD_MAX: 24000,
}));
vi.mock("@/lib/cv/draftCache", () => ({ draftHash: () => "h", findDraft: async () => null, saveDraft: async () => undefined }));
vi.mock("@/lib/cv/coverLetter", () => ({
  writeCoverLetter: async (o: { useAi: boolean }) => ({ letter: { greeting: "Hi", paragraphs: ["p"], closing: "c" }, mode: o.useAi ? "ai" : "heuristic", note: "", providerLabel: "" }),
}));
vi.mock("@/lib/cv/import/merge", () => ({ tailorToApplication: (c: unknown) => c }));
vi.mock("@/lib/cv/docx", () => ({ renderCoverLetterDocx: async () => Buffer.from("d"), renderTailoredResumeDocx: async () => Buffer.from("d") }));
vi.mock("@/lib/cv/pdf", () => ({ renderCoverLetterPdf: async () => Buffer.from("p"), renderTailoredResumePdf: async () => Buffer.from("p") }));
vi.mock("@/lib/cv/fileName", () => ({ generatedFileName: () => ({ name: "x.pdf", isoDate: "2026-10-13" }) }));
vi.mock("@/lib/cv/saveGenerated", () => ({
  saveGeneratedFile: async (spec: Record<string, unknown>) => { s.saved.push(spec); return `file${s.saved.length}`; },
}));

import { prepareLead } from "./prepare";

const user = { id: "u1", role: "superadmin" as const, plan: "free" as const, status: "active" as const };

beforeEach(() => {
  s.lead = { _id: "L1", userId: "u1", status: "shortlisted", company: "Beispiel", title: "Dev", platform: "StepStone", source: "ba", url: "https://a.de/x", description: "Kubernetes and React", fitGaps: [] };
  s.leadUpdates = [];
  s.createdApps = [];
  s.saved = [];
  s.entitled = true;
  s.tailorOk = true;
  s.resolveOk = true;
});

describe("prepareLead", () => {
  it("creates the application, both documents and marks the lead ready", async () => {
    const res = await prepareLead("L1", user);
    expect(res.ok).toBe(true);
    expect(s.createdApps[0]).toMatchObject({ companyName: "Beispiel", platform: "StepStone", applicationStatus: "Wishlist" });
    expect(s.saved.map((f) => f.docType)).toEqual(["resume", "cover-letter"]);
    expect(s.saved.every((f) => f.applicationId === "app1")).toBe(true);
    const final = s.leadUpdates.at(-1) as { $set: Record<string, unknown> };
    expect(final.$set.status).toBe("ready");
    expect((final.$set.fitGaps as { requirement: string }[]).map((g) => g.requirement)).toEqual(["Kubernetes"]);
  });

  it("falls back to non-AI documents when not entitled", async () => {
    s.entitled = false;
    const res = await prepareLead("L1", user);
    expect(res.ok).toBe(true);
    const final = s.leadUpdates.at(-1) as { $set: { prepared: { tailorMode: string; letterMode: string } } };
    expect(final.$set.prepared.tailorMode).toBe("heuristic");
    expect(final.$set.prepared.letterMode).toBe("heuristic");
  });

  it("falls back when the tailor call fails upstream", async () => {
    s.tailorOk = false;
    const res = await prepareLead("L1", user);
    expect(res.ok).toBe(true);
    expect(res.ok && res.notes[0]).toContain("Upstream failed.");
  });

  it("marks the lead failed when the CV is empty", async () => {
    s.resolveOk = false;
    const res = await prepareLead("L1", user);
    expect(res).toMatchObject({ ok: false, error: "Your CV is empty." });
    expect((s.leadUpdates.at(-1) as { $set: { status: string } }).$set.status).toBe("failed");
  });

  it("refuses dismissed leads and paused accounts", async () => {
    s.lead!.status = "dismissed";
    expect((await prepareLead("L1", user)).ok).toBe(false);
    s.lead!.status = "new";
    expect((await prepareLead("L1", { ...user, status: "paused" })).ok).toBe(false);
  });
});
