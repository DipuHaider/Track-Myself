import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/gateway", () => ({ runAiJsonTask: vi.fn() }));

import { draftCoverLetter, letterBlocks, letterPlainText, pickProjects, roleParts, sanitizeLetter } from "@/lib/cv/coverLetter";
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
    projects: [
      { name: "UK Education Consultants", stack: "Laravel", text: "ahzassociates.co.uk, built from scratch. 2022." },
      { name: "Developers' Forum", stack: "MERN", text: "profound-liger-f9751d.netlify.app, a React and Node.js forum. 2024." },
    ],
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
    expect(text).toContain("As a Senior Software Engineer, I build");
    expect(text).toContain("At Bashundhara Group, as Assistant Manager (Sr. Software Engineer), I design and maintain");
    expect(text).toContain("I also revamped legacy");
    expect(text).not.toMatch(/Architecture:|Maintenance:/);
    expect(text).toContain("Your posting asks for");
  });
});

describe("relevant projects", () => {
  const cv = normaliseContent({
    name: "T",
    projects: [
      { name: "Shop", stack: "Laravel", text: "shop.example.com" },
      { name: "Forum", stack: "React, Node.js", text: "forum.example.com. Built with a team of three." },
      { name: "", stack: "x", text: "no name" },
    ],
  });

  it("puts the projects that match the posting first", () => {
    expect(pickProjects(cv, "React and Node.js developer")).toEqual([
      "Forum – forum.example.com (React, Node.js)",
      "Shop – shop.example.com (Laravel)",
    ]);
  });

  it("prints the list before the last paragraph", () => {
    const letter = { greeting: "Hi,", paragraphs: ["One.", "Two.", "Bye."], projects: ["A", " ", "B"], closing: "Kind regards," };
    expect(letterBlocks(letter).map((b) => b.kind)).toEqual(["paragraph", "paragraph", "projects", "paragraph"]);
    expect(letterPlainText(letter)).toBe("Hi,\n\nOne.\n\nTwo.\n\nRelevant projects:\n• A\n• B\n\nBye.\n\nKind regards,");
  });

  it("keeps projects from the model and strips bullets", () => {
    const out = sanitizeLetter({ greeting: "Hi", paragraphs: ["x"], projects: ["- One", "", "• Two"], closing: "Bye" });
    expect(out?.projects).toEqual(["One", "Two"]);
    expect(sanitizeLetter({ greeting: "Hi", paragraphs: ["x"], closing: "Bye" })).not.toHaveProperty("projects");
  });
});
