"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Globe, Star } from "lucide-react";

type JobSite = {
  name: string;
  url: string;
  domain: string;
  description: string;
  color: string;
  featured?: true;
};

type FilterKey = "international" | "bangladesh" | "germany" | "uk" | "usa";

const FILTERS: { key: FilterKey; label: string; flagCode: string | null }[] = [
  { key: "international", label: "International", flagCode: null },
  { key: "bangladesh", label: "Bangladesh", flagCode: "bd" },
  { key: "germany", label: "Germany", flagCode: "de" },
  { key: "uk", label: "UK", flagCode: "gb" },
  { key: "usa", label: "USA", flagCode: "us" },
];

const SITES: Record<FilterKey, JobSite[]> = {
  international: [
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/jobs",
      domain: "linkedin.com",
      description: "World's largest professional network with 1B+ members and job listings",
      color: "#0a66c2",
      featured: true,
    },
    {
      name: "Indeed",
      url: "https://www.indeed.com",
      domain: "indeed.com",
      description: "Search millions of jobs from thousands of employers worldwide",
      color: "#003a9b",
    },
    {
      name: "Glassdoor",
      url: "https://www.glassdoor.com",
      domain: "glassdoor.com",
      description: "Find jobs with real company reviews, salaries & interview insights",
      color: "#0caa41",
    },
    {
      name: "Monster",
      url: "https://www.monster.com",
      domain: "monster.com",
      description: "Connect with top employers globally and discover your next career move",
      color: "#7c3aed",
    },
    {
      name: "ZipRecruiter",
      url: "https://www.ziprecruiter.com",
      domain: "ziprecruiter.com",
      description: "AI-powered job matching that connects you to the right employer fast",
      color: "#f16d0e",
    },
    {
      name: "CareerBuilder",
      url: "https://www.careerbuilder.com",
      domain: "careerbuilder.com",
      description: "Smart job search tools built to match you to the perfect fit",
      color: "#1565c0",
    },
  ],
  bangladesh: [
    {
      name: "BDJobs",
      url: "https://www.bdjobs.com",
      domain: "bdjobs.com",
      description: "Bangladesh's largest online job portal with 50,000+ active listings",
      color: "#e8312a",
      featured: true,
    },
    {
      name: "Chakri.com",
      url: "https://www.chakri.com",
      domain: "chakri.com",
      description: "Find your dream job in Bangladesh across all major industries",
      color: "#2563eb",
    },
    {
      name: "Prothom Alo Jobs",
      url: "https://jobs.prothomalo.com",
      domain: "prothomalo.com",
      description: "Trusted job board from Bangladesh's most-read Bengali daily newspaper",
      color: "#dc2626",
    },
    {
      name: "JobBD",
      url: "https://www.jobbd.com",
      domain: "jobbd.com",
      description: "Connecting Bangladeshi professionals with leading local employers",
      color: "#16a34a",
    },
    {
      name: "Bikroy Jobs",
      url: "https://bikroy.com/en/jobs",
      domain: "bikroy.com",
      description: "Bangladesh's popular marketplace with thousands of job listings",
      color: "#f59e0b",
    },
    {
      name: "Kormo Jobs",
      url: "https://kormo.com",
      domain: "kormo.com",
      description: "Google's job platform for entry-level and blue-collar jobs in BD",
      color: "#4285f4",
    },
  ],
  germany: [
    {
      name: "Indeed Germany",
      url: "https://de.indeed.com",
      domain: "de.indeed.com",
      description: "Germany's most visited job site with millions of open positions",
      color: "#003a9b",
    },
    {
      name: "StepStone",
      url: "https://www.stepstone.de/en",
      domain: "stepstone.de",
      description: "Germany's leading job platform for professionals and recent graduates",
      color: "#e63812",
    },
    {
      name: "Xing",
      url: "https://www.xing.com",
      domain: "xing.com",
      description: "The German-speaking professional network for career growth & networking",
      color: "#006567",
    },
    {
      name: "Arbeitsagentur",
      url: "https://www.arbeitsagentur.de",
      domain: "arbeitsagentur.de",
      description: "Germany's official Federal Employment Agency job search portal",
      color: "#003087",
    },
    {
      name: "Monster Germany",
      url: "https://www.monster.de",
      domain: "monster.de",
      description: "Find jobs and career opportunities across all German industries",
      color: "#7c3aed",
    },
    {
      name: "Experteer",
      url: "https://www.experteer.de",
      domain: "experteer.de",
      description: "Premium executive job platform for senior leadership roles in Germany",
      color: "#c41e3a",
    },
    {
      name: "Make it in Germany",
      url: "https://www.make-it-in-germany.com",
      domain: "make-it-in-germany.com",
      description: "Official German government portal for skilled workers relocating to Germany",
      color: "#cc0000",
      featured: true,
    },
  ],
  uk: [
    {
      name: "Reed",
      url: "https://www.reed.co.uk",
      domain: "reed.co.uk",
      description: "The UK's #1 job site with over 250,000 live vacancies posted daily",
      color: "#cc0000",
    },
    {
      name: "Totaljobs",
      url: "https://www.totaljobs.com",
      domain: "totaljobs.com",
      description: "Connecting candidates with top UK employers since 1999",
      color: "#e94e1b",
    },
    {
      name: "CV-Library",
      url: "https://www.cv-library.co.uk",
      domain: "cv-library.co.uk",
      description: "UK's leading independent job board with 175,000+ live listings",
      color: "#0055a4",
    },
    {
      name: "Guardian Jobs",
      url: "https://jobs.theguardian.com",
      domain: "theguardian.com",
      description: "Quality roles in media, charity, public sector, and education",
      color: "#052962",
    },
    {
      name: "Indeed UK",
      url: "https://uk.indeed.com",
      domain: "uk.indeed.com",
      description: "Search every job from every UK employer on one trusted platform",
      color: "#003a9b",
    },
    {
      name: "Jobsite",
      url: "https://www.jobsite.co.uk",
      domain: "jobsite.co.uk",
      description: "Smart job search across all UK industries with salary insights",
      color: "#d9000d",
    },
  ],
  usa: [
    {
      name: "Indeed USA",
      url: "https://www.indeed.com",
      domain: "indeed.com",
      description: "America's #1 job site with 250M+ unique monthly visitors",
      color: "#003a9b",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/jobs",
      domain: "linkedin.com",
      description: "Apply directly to top US companies on the world's largest professional network",
      color: "#0a66c2",
    },
    {
      name: "ZipRecruiter",
      url: "https://www.ziprecruiter.com",
      domain: "ziprecruiter.com",
      description: "AI job matching connects US job seekers to top employers in seconds",
      color: "#f16d0e",
    },
    {
      name: "Glassdoor",
      url: "https://www.glassdoor.com",
      domain: "glassdoor.com",
      description: "See real salaries and reviews before applying at US companies",
      color: "#0caa41",
    },
    {
      name: "Monster USA",
      url: "https://www.monster.com",
      domain: "monster.com",
      description: "Discover career opportunities at thousands of top US companies",
      color: "#7c3aed",
    },
    {
      name: "CareerBuilder",
      url: "https://www.careerbuilder.com",
      domain: "careerbuilder.com",
      description: "AI-driven US job search personalized to your skills and career goals",
      color: "#1565c0",
    },
  ],
};

const PER_PAGE = 4;
const AUTO_SCROLL_MS = 3000;

export default function JobSitesSection() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("international");
  const [page, setPage] = useState(0);
  const pausedRef = useRef(false);

  const sites = SITES[activeFilter];
  const totalPages = Math.ceil(sites.length / PER_PAGE);
  const visible = sites.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  useEffect(() => {
    if (totalPages <= 1) return;
    const id = setInterval(() => {
      if (!pausedRef.current) {
        setPage((p) => (p + 1) % totalPages);
      }
    }, AUTO_SCROLL_MS);
    return () => clearInterval(id);
  }, [totalPages, activeFilter]);

  function handleFilter(key: FilterKey) {
    setActiveFilter(key);
    setPage(0);
  }

  function prev() {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }

  function next() {
    setPage((p) => (p + 1) % totalPages);
  }

  return (
    <section id="job-sites" className="mx-auto max-w-6xl px-6 py-20">
      {/* Heading */}
      <div className="mb-10 text-center">
        <span
          className="rounded-full border px-3 py-1 text-xs font-medium"
          style={{ color: "var(--primary)", borderColor: "var(--primary)" }}
        >
          Explore Platforms
        </span>
        <h2 className="mt-3 text-3xl font-bold">Top Job Sites</h2>
        <p className="text-muted mt-2 text-sm">
          Discover the best platforms to find your next opportunity
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {FILTERS.map(({ key, label, flagCode }) => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition"
            style={
              activeFilter === key
                ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
                : { borderColor: "var(--border)", color: "var(--foreground)" }
            }
          >
            {flagCode ? (
              <img
                src={`https://flagcdn.com/w20/${flagCode}.png`}
                srcSet={`https://flagcdn.com/w40/${flagCode}.png 2x`}
                width={20}
                height={14}
                alt={label}
                className="rounded-sm object-cover"
                style={{ display: "block" }}
              />
            ) : (
              <Globe size={14} />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Cards + nav */}
      <div
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((site) => (
            <a
              key={site.name + site.url}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="surface group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
              style={site.featured ? { borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b33" } : undefined}
            >
              {/* Featured badge */}
              {site.featured && (
                <span
                  className="absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "#f59e0b", color: "#fff" }}
                >
                  <Star size={9} fill="currentColor" />
                  Featured
                </span>
              )}

              {/* Logo row */}
              <div className="flex items-start justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl"
                  style={{ background: site.color + "18" }}
                >
                  <img
                    src={`https://logo.clearbit.com/${site.domain.replace(/^[a-z]{2}\./, "")}`}
                    alt={site.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${site.url}`;
                    }}
                  />
                </div>
                <ExternalLink
                  size={13}
                  className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-60"
                  style={{ color: "var(--foreground)" }}
                />
              </div>

              {/* Name + description */}
              <div>
                <p className="text-sm font-semibold">{site.name}</p>
                <p className="text-muted mt-1 text-xs leading-relaxed">{site.description}</p>
              </div>

              {/* Domain badge */}
              <span
                className="mt-auto self-start rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: site.color + "18", color: site.color }}
              >
                {site.domain}
              </span>
            </a>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--surface-2)]"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`Go to page ${i + 1} of ${totalPages}`}
                  aria-current={i === page ? "true" : undefined}
                  className="grid h-6 w-6 place-items-center rounded-full"
                >
                  <span
                    aria-hidden="true"
                    className="block h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === page ? "20px" : "6px",
                      background: i === page ? "var(--primary)" : "var(--surface-2)",
                    }}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--surface-2)]"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
