import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/gateway", () => ({ runAiJsonTask: vi.fn() }));

import { draftApplicationEmail, sanitizeEmail } from "@/lib/cv/applicationEmail";
import { normaliseContent } from "@/lib/cv/content";

const cv = normaliseContent({
  name: "Test Person",
  positioning: "Senior Software Engineer",
  contact: { email: "test@example.com", phone: "+880) 171-7768146", linkedin: "linkedin.com/in/test" },
  skills: [{ label: "Languages", items: "TypeScript, React, Node.js, PHP" }],
  experience: [{ title: "Bashundhara Group", company: "Dhaka, Bangladesh Assistant Manager", bullets: [] }],
});
const info = {
  companyName: "P&T Software",
  jobTitle: "Full Stack Developer",
  platform: "StepStone",
  jobDescription: "React and TypeScript on the frontend, Node.js on the backend.",
};

describe("draftApplicationEmail", () => {
  it("writes a subject and a signed body for this job", () => {
    const { subject, body } = draftApplicationEmail(cv, info);
    expect(subject).toBe("Application: Full Stack Developer – Test Person");
    expect(body).toMatch(/^Dear Hiring Manager,/);
    expect(body).toContain("Full Stack Developer position at P&T Software, which I found on StepStone.");
    expect(body).toContain("at Bashundhara Group");
    expect(body).toContain("which matches what your posting asks for");
    expect(body).toContain("Test Person\n(+880) 171-7768146\ntest@example.com\nlinkedin.com/in/test");
    expect(body).not.toMatch(/\n{3,}/);
  });
});

describe("sanitizeEmail", () => {
  it("adds the signature when the model left it out", () => {
    const out = sanitizeEmail({ subject: "  Application  for X ", body: "Dear Ms Weber,\n\n\n\nHello.\nKind regards," }, cv);
    expect(out?.subject).toBe("Application for X");
    expect(out?.body).toBe("Dear Ms Weber,\n\nHello.\nKind regards,\nTest Person\n(+880) 171-7768146\ntest@example.com\nlinkedin.com/in/test");
  });

  it("rejects an empty reply", () => {
    expect(sanitizeEmail({ subject: "", body: "x" }, cv)).toBeNull();
  });
});
