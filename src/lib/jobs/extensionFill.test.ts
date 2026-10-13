import { describe, expect, it } from "vitest";
import { bestAnswer, fieldKey, leadIdFromHash, looksSubmitted, similarity, yesNo } from "../../../browser-extension/src/fillRules";

describe("fieldKey", () => {
  it("prefers autocomplete and input type", () => {
    expect(fieldKey("Whatever", "given-name")).toBe("firstName");
    expect(fieldKey("Kontakt", "", "", "email")).toBe("email");
    expect(fieldKey("", "section-x tel")).toBe("phone");
  });

  it("matches English and German labels, specific before general", () => {
    expect(fieldKey("First name *")).toBe("firstName");
    expect(fieldKey("Vorname")).toBe("firstName");
    expect(fieldKey("Nachname")).toBe("lastName");
    expect(fieldKey("Mobile phone number")).toBe("phone");
    expect(fieldKey("LinkedIn Profile URL")).toBe("linkedinUrl");
    expect(fieldKey("Gehaltsvorstellung (brutto/Jahr)")).toBe("salaryExpectation");
    expect(fieldKey("Frühester Eintrittstermin")).toBe("startDate");
    expect(fieldKey("Anschreiben")).toBe("coverLetter");
    expect(fieldKey("Name")).toBe("fullName");
  });

  it("leaves unknown questions alone", () => {
    expect(fieldKey("How many years of React experience do you have?")).toBeNull();
    expect(fieldKey("Do you require visa sponsorship?")).toBe("workPermit");
  });
});

describe("screening answers", () => {
  const bank = [
    { question: "How many years of experience do you have with React?", answer: "5" },
    { question: "Are you legally authorized to work in Germany?", answer: "Yes" },
    { question: "Will you now or in the future require sponsorship?", answer: "No" },
  ];

  it("uses an answer only for a clearly matching question", () => {
    expect(bestAnswer("How many years of work experience do you have with React.js?", bank)).toBe("5");
    expect(bestAnswer("Are you authorized to work in Germany?", bank)).toBe("Yes");
    expect(bestAnswer("What is your favourite colour?", bank)).toBeNull();
  });

  it("refuses when two saved questions are equally close", () => {
    const tie = [{ question: "years experience python", answer: "3" }, { question: "years experience java", answer: "7" }];
    expect(bestAnswer("years experience", tie)).toBeNull();
  });

  it("helpers", () => {
    expect(similarity("a b c", "")).toBe(0);
    expect(yesNo("Ja, gerne")).toBe("yes");
    expect(yesNo("No")).toBe("no");
    expect(yesNo("maybe")).toBeNull();
  });
});

describe("page signals", () => {
  it("recognises confirmations", () => {
    expect(looksSubmitted("Your application was sent to Beispiel GmbH")).toBe(true);
    expect(looksSubmitted("Vielen Dank für Ihre Bewerbung!")).toBe(true);
    expect(looksSubmitted("Review your application before submitting")).toBe(false);
  });

  it("reads the lead id from the link", () => {
    expect(leadIdFromHash("#tm-lead=0123456789abcdef01234567")).toBe("0123456789abcdef01234567");
    expect(leadIdFromHash("#jobs&tm-lead=0123456789abcdef01234567")).toBe("0123456789abcdef01234567");
    expect(leadIdFromHash("#tm-lead=nope")).toBeNull();
  });
});
