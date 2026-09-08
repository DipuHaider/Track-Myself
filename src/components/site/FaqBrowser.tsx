"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";
import { FAQ, FAQ_CATEGORIES, type FaqCategory } from "@/lib/faq";

export default function FaqBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "All">("All");

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return FAQ.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (!q) return true;
      return `${item.q} ${item.a} ${item.category}`.toLowerCase().includes(q);
    });
  }, [query, category]);

  const grouped = FAQ_CATEGORIES
    .map((cat) => ({ cat, items: results.filter((i) => i.category === cat) }))
    .filter((g) => g.items.length > 0);

  const counts = useMemo(() => {
    const map = new Map<FaqCategory, number>();
    for (const item of FAQ) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, []);

  return (
    <>
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search
            size={16}
            className="text-muted pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the answers…"
            aria-label="Search frequently asked questions"
            className="surface w-full rounded-lg border py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition hover:bg-[var(--surface-2)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip
            label={`All (${FAQ.length})`}
            active={category === "All"}
            onClick={() => setCategory("All")}
          />
          {FAQ_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={`${cat} (${counts.get(cat) ?? 0})`}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="surface rounded-xl border p-10 text-center">
          <p className="text-sm font-medium">No answer matches &ldquo;{query}&rdquo;</p>
          <p className="text-muted mt-1.5 text-sm">
            Try a different word, or{" "}
            <button type="button" onClick={() => { setQuery(""); setCategory("All"); }} className="underline">
              clear the filters
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ cat, items }) => (
            <section key={cat} aria-labelledby={`cat-${cat.replace(/\W+/g, "-")}`}>
              <h2
                id={`cat-${cat.replace(/\W+/g, "-")}`}
                className="text-muted mb-3 font-mono text-[11px] uppercase tracking-[0.18em]"
              >
                {cat}
              </h2>

              <div className="surface overflow-hidden rounded-xl border">
                {items.map((item) => (
                  <details
                    key={item.id}
                    id={item.id}
                    className="group border-b last:border-b-0 [&[open]_svg]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium transition hover:bg-[var(--surface-2)]">
                      {item.q}
                      <ChevronDown
                        size={15}
                        className="text-muted shrink-0 transition-transform"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-muted text-sm leading-relaxed">{item.a}</p>
                      {item.links && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {item.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="text-sm font-semibold hover:underline"
                              style={{ color: "var(--primary)" }}
                            >
                              {link.label} →
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
      style={active
        ? { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface-2)" }
        : { borderColor: "var(--border)" }}
    >
      {label}
    </button>
  );
}
