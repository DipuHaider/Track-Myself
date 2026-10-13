import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/gateway", () => ({ runAiJsonTask: vi.fn() }));

import { draftCoverLetter, roleParts } from "@/lib/cv/coverLetter";
import { normaliseContent, tidyPhone } from "@/lib/cv/content";

describe("roleParts", () => {
  it("swaps an employer stored as the title and drops a place prefix", () => {
    expect(roleParts({
      title: "Bashundhara Group",
      company: "Dhaka, Bangladesh Assistant Manager (Sr. Software Engineer)",
    })).toEqual({ title: "Assistant Manager (Sr. Software Engineer)", company: "Bashundhara Group" });
  });

  it("leaves a well-formed role alone", () => {
    expect(roleParts({ title: "Senior Engineer", company: "Acme GmbH" }))
      .toEqual({ title: "Senior Engineer", company: "Acme GmbH" });
  });
});

describe("tidyPhone", () => {
  it("restores a missing opening bracket", () => {
    expect(tidyPhone("+880) 171-7768146")).toBe("(+880) 171-7768146");
  });

  it("keeps balanced and plain numbers", () => {
    expect(tidyPhone("(+880) 171-7768146")).toBe("(+880) 171-7768146");
    expect(tidyPhone("+49 30 1234567")).toBe("+49 30 1234567");
  });
});

describe("draftCoverLetter", () => {
  const cv = normaliseContent({
    name: "Test Person",
    positioning: "Senior Software Engineer",
    contact: { phone: "+880) 171-7768146" },
    skills: [{ label: "Languages", items: "TypeScript, React, Node.js, PHP" }],
    experience: [{
      title: "Bashundhara Group",
      company: "Dhaka, Bangladesh Assistant Manager (Sr. Software Engineer)",
      bullets: [
        "Backend Architecture: Design and maintain robust backend systems using Next.js and Node.js.",
        "Revamp & Maintenance: Revamped legacy WordPress/Laravel systems for 20+ sites.",
      ],
    }],
  });

  it("names role and employer correctly and strips bullet labels", () => {
    const text = draftCoverLetter(cv, {
      companyName: "P&T Software",
      jobTitle: "Full Stack Developer",
      jobDescription: "We need React, TypeScript and Node.js for our backend systems.",
    }).paragraphs.join("\n");

    expect(cv.contact.phone).toBe("(+880) 171-7768146");
    expect(text).toContain("currently with Bashundhara Group");
    expect(text).toContain("In my role as Assistant Manager (Sr. Software Engineer) at Bashundhara Group, I design and maintain");
    expect(text).toContain("I also revamped legacy");
    expect(text).not.toMatch(/Architecture:|Maintenance:/);
    expect(text).toContain("Your posting asks for");
  });
});
