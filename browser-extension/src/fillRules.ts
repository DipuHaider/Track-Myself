export type ApplicantKey =
  | "firstName" | "lastName" | "fullName" | "email" | "phone" | "city"
  | "linkedinUrl" | "websiteUrl" | "salaryExpectation" | "noticePeriod" | "workPermit" | "startDate"
  | "coverLetter";

const AUTOCOMPLETE: Record<string, ApplicantKey> = {
  "given-name": "firstName",
  "family-name": "lastName",
  name: "fullName",
  email: "email",
  tel: "phone",
  "tel-national": "phone",
  "address-level2": "city",
  url: "websiteUrl",
};

/* English and German labels, ordered most specific first: "first name" must
   win over "name", "LinkedIn URL" over "URL". Only an unambiguous match is
   filled; anything else is left for the owner and highlighted. */
const RULES: [RegExp, ApplicantKey][] = [
  [/\b(first|given)\s*name\b|\bvorname\b/i, "firstName"],
  [/\b(last|family|sur)\s*name\b|\bsurname\b|\bnachname\b|\bfamilienname\b/i, "lastName"],
  [/\bfull\s*name\b|\bvollständiger name\b|^\s*name\s*\*?\s*$|^\s*ihr name\s*\*?\s*$/i, "fullName"],
  [/e-?mail/i, "email"],
  [/\b(phone|mobile|telephone|telefon|handy|mobilnummer|telefonnummer)\b/i, "phone"],
  [/linked\s*in/i, "linkedinUrl"],
  [/\b(website|portfolio|homepage|github|webseite)\b/i, "websiteUrl"],
  [/\b(salary|gehalt|gehaltsvorstellung|compensation|vergütung)\b/i, "salaryExpectation"],
  [/\b(notice\s*period|kündigungsfrist)\b/i, "noticePeriod"],
  [/\b(work\s*permit|visa|right to work|arbeitserlaubnis|aufenthaltstitel)\b/i, "workPermit"],
  [/\b(start\s*date|earliest start|available from|eintrittstermin|frühester eintritt|verfügbar ab)\b/i, "startDate"],
  [/\b(city|town|wohnort|stadt)\b/i, "city"],
  [/\b(cover\s*letter|anschreiben|motivation|message to the hiring|nachricht an)\b/i, "coverLetter"],
];

export function fieldKey(label: string, autocomplete = "", name = "", type = ""): ApplicantKey | null {
  const ac = autocomplete.toLowerCase().split(/\s+/).pop() ?? "";
  if (AUTOCOMPLETE[ac]) return AUTOCOMPLETE[ac];
  if (type === "email") return "email";
  if (type === "tel") return "phone";
  const text = `${label} ${name.replace(/[_\-[\]]+/g, " ")}`.trim();
  for (const [re, key] of RULES) if (re.test(text)) return key;
  return null;
}

const STOP = new Set([
  "the", "a", "an", "you", "your", "do", "are", "have", "is", "of", "to", "in", "for", "with", "and", "or", "this", "that",
  "sie", "du", "ihr", "ihre", "haben", "sind", "die", "der", "das", "ein", "eine", "und", "oder", "für", "mit", "zu",
]);

function words(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9äöüß\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)),
  );
}

export function similarity(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const w of A) if (B.has(w)) common++;
  return common / (A.size + B.size - common);
}

/* A saved answer is used only when its question clearly is the one on the
   form: a high word overlap, and clearly better than the runner-up. */
export function bestAnswer(question: string, bank: { question: string; answer: string }[], threshold = 0.5): string | null {
  let best = { score: 0, answer: "" };
  let second = 0;
  for (const item of bank) {
    const score = similarity(question, item.question);
    if (score > best.score) {
      second = best.score;
      best = { score, answer: item.answer };
    } else if (score > second) {
      second = score;
    }
  }
  if (best.score < threshold) return null;
  if (second > 0 && best.score - second < 0.15) return null;
  return best.answer;
}

export function yesNo(answer: string): "yes" | "no" | null {
  const a = answer.trim().toLowerCase();
  if (/^(yes|ja|y|true|1)\b/.test(a)) return "yes";
  if (/^(no|nein|n|false|0)\b/.test(a)) return "no";
  return null;
}

export const CONFIRMATION = new RegExp(
  [
    "your application was sent",
    "application (?:was |has been )?submitted",
    "application sent",
    "thanks for applying",
    "thank you for applying",
    "bewerbung (?:wurde )?(?:erfolgreich )?(?:versendet|gesendet|abgeschickt|übermittelt)",
    "vielen dank für (?:ihre|deine) bewerbung",
    "deine bewerbung ist (?:bei uns )?eingegangen",
  ].join("|"),
  "i",
);

export function looksSubmitted(pageText: string): boolean {
  return CONFIRMATION.test(pageText);
}

export function leadIdFromHash(hash: string): string | null {
  const m = hash.match(/(?:^#|&)tm-lead=([a-f0-9]{24})/i);
  return m ? m[1] : null;
}
