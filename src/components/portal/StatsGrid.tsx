"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Briefcase, CircleDashed, Clock, Copy, Ghost, Heart, MessageSquare, PauseCircle, Send, Star, TrendingUp, Trophy, XCircle,
} from "lucide-react";
import { useApplicationStats, type ApplicationStats } from "@/hooks/useApplicationStats";
import { APPLICATION_STATUSES, NOT_COMPLETED_STATUS, OFFER_RECEIVED_STATUS, REJECTED_STATUS } from "@/constants/applicationStatus";

type Card = { label: string; value: number; icon: ReactNode; chip: string; href: string };

function statusHref(status: string) {
  return `/me/applications?status=${encodeURIComponent(status)}`;
}

function cardsFor(s: ApplicationStats): Card[] {
  const by = (status: string) => s.byStatus[status] ?? 0;
  const interviews = APPLICATION_STATUSES
    .filter((st) => st.startsWith("Active") || st === "Interview Scheduled")
    .reduce((sum, st) => sum + by(st), 0);
  const offers = by(OFFER_RECEIVED_STATUS);
  return [
    { label: "Total Applications", value: s.total,              icon: <Briefcase size={16} />,     chip: "status-submitted",     href: "/me/applications" },
    { label: "Favourites",         value: s.favourites,         icon: <Star size={16} />,          chip: "priority-medium",      href: "/me/applications?flag=favourite" },
    { label: "Wishlist",           value: by("Wishlist"),       icon: <Star size={16} />,          chip: "status-active",        href: statusHref("Wishlist") },
    { label: "Not Completed",      value: by(NOT_COMPLETED_STATUS), icon: <CircleDashed size={16} />, chip: "status-not-completed", href: statusHref(NOT_COMPLETED_STATUS) },
    { label: "Submitted",          value: by("Submitted"),      icon: <Send size={16} />,          chip: "status-submitted",     href: statusHref("Submitted") },
    { label: "No Response",        value: by("No Response"),    icon: <Clock size={16} />,         chip: "status-no-resp",       href: statusHref("No Response") },
    { label: "Interviews",         value: interviews,           icon: <MessageSquare size={16} />, chip: "status-interview",     href: statusHref("Interview Scheduled") },
    { label: "Offers Received",    value: offers,               icon: <Trophy size={16} />,        chip: "status-offer",         href: statusHref(OFFER_RECEIVED_STATUS) },
    { label: "Rejected",           value: by(REJECTED_STATUS),  icon: <XCircle size={16} />,       chip: "status-rejected",      href: statusHref(REJECTED_STATUS) },
    { label: "Warm Leads",         value: s.warmLeads,          icon: <Heart size={16} />,         chip: "status-offer",         href: "/me/applications?flag=warm" },
    { label: "Success Rate %",     value: s.total ? Math.round((offers / s.total) * 100) : 0, icon: <TrendingUp size={16} />, chip: "status-interview", href: statusHref(OFFER_RECEIVED_STATUS) },
    { label: "Ghost Jobs",         value: s.ghostManual,        icon: <Ghost size={16} />,         chip: "ghost-manual",         href: "/me/applications?flag=ghost-manual" },
    { label: "Duplicates",         value: s.duplicates,         icon: <Copy size={16} />,          chip: "badge-dup",            href: "/me/applications?flag=duplicate" },
  ];
}

export function PausedCard() {
  return (
    <div className="alert alert-warning items-center" role="status">
      <PauseCircle size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">Tracking is paused. Your applications are safe and will be back when you resume.</span>
      <Link href="/me/settings?tab=data" className="font-semibold underline underline-offset-2">Resume</Link>
    </div>
  );
}

export default function StatsGrid() {
  const { stats, loading, error, paused } = useApplicationStats();

  return (
    <section data-tour="pipeline">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted text-sm font-semibold uppercase tracking-wide">Your Stats</h2>
        <Link href="/me/applications" className="text-primary text-xs">View all applications →</Link>
      </div>

      {paused ? (
        <PausedCard />
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error.message}</div>
      ) : loading || !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading stats</span>
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="surface h-20 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-muted mb-3 text-xs">Click a card to open those applications.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cardsFor(stats).map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="surface flex items-center gap-4 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-sm active:translate-y-0"
              >
                <span className={`icon-chip ${c.chip}`} aria-hidden="true">{c.icon}</span>
                <span>
                  <span className="block text-2xl font-bold">{c.value}</span>
                  <span className="text-muted block text-xs">{c.label}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
