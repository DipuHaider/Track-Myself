"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BarChart3, Briefcase, FileText, Globe, Search,
  Shield, User, Wrench, X,
} from "lucide-react";
import { GROUP_LABELS, GROUP_ORDER, type SearchGroupKey } from "@/lib/searchIndex";

type SearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  group: SearchGroupKey;
};

const STATUS_COLOR: Record<string, string> = {
  "Wishlist": "status-wishlist",
  "Submitted": "status-submitted",
  "No Response": "status-no-resp",
  "Interview Scheduled": "status-interview",
  "Offer Received": "status-offer",
  "Rejected": "status-rejected",
};

const GROUP_ICON: Record<SearchGroupKey, React.ReactNode> = {
  applications: <Briefcase size={15} />,
  documents: <FileText size={15} />,
  users: <User size={15} />,
  portal: <User size={15} />,
  dashboard: <BarChart3 size={15} />,
  tools: <Wrench size={15} />,
  pages: <Globe size={15} />,
};

const ROLE_BADGES = new Set(["superadmin", "admin", "editor", "paid", "free"]);

function badgeClass(group: SearchGroupKey, badge: string) {
  if (group === "users") return ROLE_BADGES.has(badge) ? `role-${badge}` : "status-wishlist";
  if (badge.startsWith("Active")) return "status-active";
  return STATUS_COLOR[badge] ?? "status-wishlist";
}

const SCOPE_HINT: Record<string, string> = {
  public: "Searching pages and tools. Sign in to search your applications and documents.",
  account: "Searching pages, your applications and your documents.",
  platform: "Searching pages, every user's applications, users and your documents.",
};

export default function SiteSearch() {
  const { data: session } = useSession();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [scope, setScope] = useState<string>(session ? "account" : "public");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    const timer = setTimeout(async () => {
      if (!term) {
        setHits([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (res.ok) {
          const data = await res.json();
          setHits(Array.isArray(data.hits) ? data.hits : []);
          if (data.scope && data.scope !== "empty") setScope(data.scope);
        }
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [query]);

  const close = () => { setOpen(false); setQuery(""); setHits([]); };

  const grouped = GROUP_ORDER
    .map((group) => ({ group, items: hits.filter((h) => h.group === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition hover:bg-[var(--surface-2)] md:min-w-[17rem]"
        aria-label="Search the site"
      >
        <Search size={18} aria-hidden="true" />
        <span className="hidden md:block">Search…</span>
        <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[11px] md:block">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-20"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="surface w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search size={15} className="text-muted shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={session ? "Search pages, applications, documents…" : "Search pages and tools…"}
                className="flex-1 bg-transparent text-sm outline-none"
                aria-label="Search query"
              />
              {loading && <span className="text-muted text-xs">Searching…</span>}
              <button
                type="button"
                onClick={close}
                className="text-muted transition hover:text-foreground"
                aria-label="Close search"
              >
                <X size={15} />
              </button>
            </div>

            {grouped.length > 0 && (
              <div className="max-h-96 overflow-y-auto p-2">
                {grouped.map(({ group, items }) => (
                  <div key={group} className="mb-1 last:mb-0">
                    <p className="text-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide">
                      {GROUP_LABELS[group]}
                    </p>
                    <ul role="list">
                      {items.map((hit) => (
                        <li key={`${hit.group}-${hit.id}`}>
                          <Link
                            href={hit.href}
                            onClick={close}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                          >
                            <span className="text-muted shrink-0" aria-hidden="true">
                              {GROUP_ICON[hit.group]}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{hit.title}</span>
                              <span className="text-muted block truncate text-xs">{hit.subtitle}</span>
                            </span>
                            {hit.badge && (
                              <span className={`role-badge shrink-0 text-xs ${badgeClass(hit.group, hit.badge)}`}>
                                {hit.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {query.trim() && !loading && grouped.length === 0 && (
              <p className="text-muted px-4 py-8 text-center text-sm">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}

            <div className="surface-muted flex items-center gap-2 border-t px-4 py-2.5">
              <Shield size={11} className="text-muted shrink-0" aria-hidden="true" />
              <p className="text-muted text-[11px] leading-snug">
                {SCOPE_HINT[scope] ?? SCOPE_HINT.public}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
