"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Briefcase } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type AppResult = {
  _id: string;
  companyName: string;
  jobTitle: string;
  applicationStatus: string;
};

const STATUS_COLOR: Record<string, string> = {
  "Wishlist": "status-wishlist",
  "Submitted": "status-submitted",
  "No Response": "status-no-resp",
  "Interview Scheduled": "status-interview",
  "Offer Received": "status-offer",
  "Rejected": "status-rejected",
};

function statusClass(s: string) {
  if (s.startsWith("Active")) return "status-active";
  return STATUS_COLOR[s] ?? "status-wishlist";
}

export default function SiteSearch() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isBackend = role === "superadmin" || role === "admin" || role === "editor";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K shortcut
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

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/applications?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data: AppResult[] = await res.json();
          setResults(data.slice(0, 6));
        }
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const close = () => { setOpen(false); setQuery(""); setResults([]); };

  // Link target depends on role
  const appHref = (id: string) =>
    isBackend ? `/applications/${id}` : `/me`;

  if (!session) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted transition hover:bg-[var(--surface-2)]"
        aria-label="Search"
      >
        <Search size={14} />
        <span className="hidden md:block">Search…</span>
        <kbd className="hidden rounded border px-1 py-0.5 font-mono text-[10px] md:block">
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-20"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="surface w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl">
            {/* Input */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search size={15} className="text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search applications…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {loading && (
                <span className="text-muted text-xs">Searching…</span>
              )}
              <button onClick={close} className="text-muted hover:text-foreground transition">
                <X size={15} />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul className="max-h-72 overflow-y-auto p-2">
                {results.map((app) => (
                  <li key={app._id}>
                    <Link
                      href={appHref(app._id)}
                      onClick={close}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                    >
                      <Briefcase size={15} className="text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{app.companyName}</p>
                        <p className="text-muted truncate text-xs">{app.jobTitle}</p>
                      </div>
                      <span className={`role-badge shrink-0 text-xs ${statusClass(app.applicationStatus)}`}>
                        {app.applicationStatus}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state */}
            {query.trim() && !loading && results.length === 0 && (
              <p className="text-muted px-4 py-8 text-center text-sm">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}

            {/* Hint when empty */}
            {!query.trim() && (
              <p className="text-muted px-4 py-6 text-center text-xs">
                Type to search your applications…
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
