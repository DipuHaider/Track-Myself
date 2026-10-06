const WORKPLACE_ONLY = /^(?:fully\s+|100%\s+)?(?:remote|hybrid|on[\s-]?site|in[\s-]?office|work from home|wfh|anywhere)$/i;

const WORKPLACE_PREFIX = /^(?:temporarily\s+)?(?:remote|hybrid(?:\s+(?:work|remote))?|on[\s-]?site)\s+in\s+/i;

const WORKPLACE_SUFFIX = /\s*[([]\s*(?:remote|hybrid|on[\s-]?site|in[\s-]?office)\s*[)\]]\s*$/i;

const WORKPLACE_WRAPPED = /^(?:remote|hybrid|on[\s-]?site)\s*(?:[([]\s*(.+?)\s*[)\]]|[-–—:]\s*(.+))$/i;

const METRO_SUFFIX = /\s+(?:metropolitan|metro)\s+(?:area|region)$/i;

const US_STATES = new Set(
  ("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM " +
   "NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC").split(" "),
);

const CA_PROVINCES = new Set("AB BC MB NB NL NS NT NU ON PE QC SK YT".split(" "));

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "united states of america": "United States",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  "northern ireland": "United Kingdom",
  uae: "United Arab Emirates",
  turkey: "Türkiye",
  "czech republic": "Czechia",
  "the netherlands": "Netherlands",
  holland: "Netherlands",
  deutschland: "Germany",
  "south korea": "South Korea",
  "korea, republic of": "South Korea",
  russia: "Russia",
};

let countryIndex: Map<string, string> | null = null;
let regionNames: Intl.DisplayNames | null = null;

function regions(): Intl.DisplayNames | null {
  if (regionNames) return regionNames;
  try {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    regionNames = null;
  }
  return regionNames;
}

function countries(): Map<string, string> {
  if (countryIndex) return countryIndex;
  const index = new Map<string, string>();
  const names = regions();
  if (names) {
    const A = 65;
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        const code = String.fromCharCode(A + i, A + j);
        let name: string | undefined;
        try { name = names.of(code); } catch { name = undefined; }
        if (name && name !== code && !/unknown/i.test(name)) index.set(name.toLowerCase(), name);
      }
    }
  }
  for (const [alias, name] of Object.entries(COUNTRY_ALIASES)) index.set(alias, name);
  countryIndex = index;
  return index;
}

export function countryName(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^[A-Za-z]{2}$/.test(t) && t === t.toUpperCase()) {
    try {
      const name = regions()?.of(t);
      if (name && name !== t) return name;
    } catch { /* not a region code */ }
  }
  return countries().get(t.toLowerCase()) ?? "";
}

export function cleanLocation(raw: string): string {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t || WORKPLACE_ONLY.test(t)) return "";
  t = t.split(/\s*[·•|]\s*/).find((part) => part && !WORKPLACE_ONLY.test(part)) ?? "";
  const wrapped = t.match(WORKPLACE_WRAPPED);
  if (wrapped) t = (wrapped[1] ?? wrapped[2] ?? "").trim();
  t = t.replace(WORKPLACE_PREFIX, "").replace(WORKPLACE_SUFFIX, "").trim();
  if (!t || WORKPLACE_ONLY.test(t)) return "";

  const seen = new Set<string>();
  const parts = t
    .split(",")
    .map((p) => p.replace(/\b\d{4,6}\b/g, "").replace(/^greater\s+/i, "").replace(METRO_SUFFIX, "").replace(/\s+/g, " ").trim())
    .filter((p) => {
      const key = p.toLowerCase();
      if (!p || seen.has(key) || WORKPLACE_ONLY.test(p)) return false;
      seen.add(key);
      return true;
    });
  return parts.join(", ");
}

export function splitLocation(raw: string): { city: string; country: string; label: string } {
  const label = cleanLocation(raw);
  if (!label) return { city: "", country: "", label: "" };

  const parts = label.split(",").map((p) => p.trim());
  const last = parts[parts.length - 1];

  if (parts.length === 1) {
    const country = countryName(last);
    return country ? { city: "", country, label: country } : { city: last, country: "", label };
  }

  const city = parts[0];
  if (US_STATES.has(last)) return { city, country: "United States", label };
  if (CA_PROVINCES.has(last)) return { city, country: "Canada", label };

  const country = countryName(last);
  if (country) return { city, country, label: `${city}, ${country}` };
  return { city, country: "", label };
}

export function formatLocation(app: { city?: string | null; country?: string | null; location?: string | null }): string {
  const parts = [app.city, app.country].map((p) => (p ?? "").trim()).filter(Boolean);
  if (parts.length) return [...new Set(parts)].join(", ");
  return (app.location ?? "").trim();
}
