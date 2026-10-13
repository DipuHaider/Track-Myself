export type HarvestSite = "linkedin" | "xing" | "stepstone" | "indeed";

export type HarvestedLead = {
  title: string;
  company: string;
  url: string;
  location?: string;
  postedAgeText?: string;
  postedAt?: string;
  externalId?: string;
};

type SiteRule = {
  isSearchPage: (url: URL) => boolean;
  link: RegExp;
  card: string;
  title: string[];
  company: string[];
  location: string[];
  posted: string[];
  canonical: (href: string) => { url: string; id: string } | null;
};

const RULES: Record<HarvestSite, SiteRule> = {
  linkedin: {
    isSearchPage: (u) => /^\/jobs\/(search|collections)/.test(u.pathname),
    link: /\/jobs\/view\/(\d+)/,
    card: "li[data-occludable-job-id], li.jobs-search-results__list-item, div.job-card-container, li.scaffold-layout__list-item",
    title: ["a.job-card-list__title", "a.job-card-container__link", ".job-card-list__title--link", "strong"],
    company: [".artdeco-entity-lockup__subtitle", ".job-card-container__primary-description", ".job-card-container__company-name"],
    location: [".job-card-container__metadata-item", ".artdeco-entity-lockup__caption"],
    posted: ["time", ".job-card-container__listed-time", ".job-card-list__footer-wrapper time"],
    canonical: (href) => {
      const id = href.match(/\/jobs\/view\/(\d+)/)?.[1];
      return id ? { url: `https://www.linkedin.com/jobs/view/${id}/`, id } : null;
    },
  },
  xing: {
    isSearchPage: (u) => /^\/jobs\/(search|find)/.test(u.pathname) || (u.pathname === "/jobs" && u.search.includes("keywords")),
    link: /\/jobs\/[a-z0-9-]+-\d{5,}/i,
    card: "article, li[data-testid*='job'], div[data-testid*='job-search-result']",
    title: ["h2", "h3", "[data-testid*='job-teaser-list-title']", "a[data-testid*='job']"],
    company: ["[data-testid*='company']", "p", "span"],
    location: ["[data-testid*='location']", "[class*='location']"],
    posted: ["time", "[data-testid*='date']", "[class*='date']"],
    canonical: (href) => {
      const m = href.match(/(https:\/\/www\.xing\.com)?(\/jobs\/[a-z0-9-]+-(\d{5,}))/i);
      return m ? { url: `https://www.xing.com${m[2]}`, id: m[3] } : null;
    },
  },
  stepstone: {
    isSearchPage: (u) => /^\/(jobs|work)\//.test(u.pathname) || u.pathname.startsWith("/5/ergebnisliste"),
    link: /\/stellenangebote--[^"?#]+--\d+-inline\.html/i,
    card: "article[data-at='job-item'], article[data-testid*='job-item'], article",
    title: ["[data-at='job-item-title']", "h2", "a[data-at='job-item-title']"],
    company: ["[data-at='job-item-company-name']", "[data-testid*='company']", "span[class*='company']"],
    location: ["[data-at='job-item-location']", "[data-testid*='location']"],
    posted: ["[data-at='job-item-timeago']", "time"],
    canonical: (href) => {
      const m = href.match(/(https:\/\/www\.stepstone\.de)?(\/stellenangebote--[^"?#]+--(\d+)-inline\.html)/i);
      return m ? { url: `https://www.stepstone.de${m[2]}`, id: m[3] } : null;
    },
  },
  indeed: {
    isSearchPage: (u) => u.pathname.startsWith("/jobs") || u.pathname === "/",
    link: /[?&](?:jk|vjk)=([a-z0-9]+)/i,
    card: "div.job_seen_beacon, li div.cardOutline, td.resultContent",
    title: ["h2.jobTitle span[title]", "h2.jobTitle", "a.jcs-JobTitle span"],
    company: ["[data-testid='company-name']", ".companyName"],
    location: ["[data-testid='text-location']", ".companyLocation"],
    posted: ["[data-testid='myJobsStateDate']", ".date"],
    canonical: (href) => {
      const id = href.match(/[?&](?:jk|vjk)=([a-z0-9]+)/i)?.[1];
      return id ? { url: `https://www.indeed.com/viewjob?jk=${id}`, id } : null;
    },
  },
};

export function isSearchPage(site: HarvestSite, href = location.href): boolean {
  try {
    return RULES[site].isSearchPage(new URL(href));
  } catch {
    return false;
  }
}

function textOf(root: Element, selectors: string[]): string {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const t = el?.textContent?.replace(/\s+/g, " ").trim();
    if (t) return t;
  }
  return "";
}

/* Reads only what the results page already shows: cards rendered in the
   owner's own browser after they opened their own search. No scrolling, no
   paging, no extra requests to the site. */
export function harvestCards(site: HarvestSite, limit = 50): HarvestedLead[] {
  const rule = RULES[site];
  const seen = new Set<string>();
  const out: HarvestedLead[] = [];

  const anchors = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].filter((a) => rule.link.test(a.href));
  for (const a of anchors) {
    const canon = rule.canonical(a.href);
    if (!canon || seen.has(canon.id)) continue;
    const card = a.closest(rule.card) ?? a.parentElement?.parentElement ?? a;
    const title = textOf(card, rule.title) || a.textContent?.replace(/\s+/g, " ").trim() || "";
    let company = textOf(card, rule.company);
    if (company === title) company = "";
    if (!title || !company || title.length > 300) continue;
    seen.add(canon.id);
    const timeEl = card.querySelector("time[datetime]");
    out.push({
      title: title.slice(0, 300),
      company: company.slice(0, 200),
      url: canon.url,
      externalId: canon.id,
      location: textOf(card, rule.location).slice(0, 200) || undefined,
      postedAgeText: textOf(card, rule.posted).slice(0, 60) || undefined,
      postedAt: timeEl?.getAttribute("datetime") ?? undefined,
    });
    if (out.length >= limit) break;
  }
  return out;
}
