"use client";

import type { ReactNode } from "react";
import {
  CalendarClock, CircleDashed, Clock, Code, Flag, HeartHandshake, PenLine, Send, Star, Trophy, Users, XCircle,
} from "lucide-react";
import { STATUS_CLASS } from "@/components/applications/StatusBadge";
import type { Application } from "@/types/application";

const STATUS_ICON: Record<string, ReactNode> = {
  "Wishlist":              <Star size={14} />,
  "Not Completed":         <CircleDashed size={14} />,
  "Submitted":             <Send size={14} />,
  "No Response":           <Clock size={14} />,
  "Interview Scheduled":   <CalendarClock size={14} />,
  "Active - Written":      <PenLine size={14} />,
  "Active - HR":           <Users size={14} />,
  "Active - Technical":    <Code size={14} />,
  "Active - Cultural Fit": <HeartHandshake size={14} />,
  "Offer Received":        <Trophy size={14} />,
  "Rejected":              <XCircle size={14} />,
};

type Step = { status: string; at?: string | Date; kind: string; byId?: string; byName?: string };

function formatWhen(d?: string | Date) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function stepsOf(app: Application): Step[] {
  const history = [...(app.statusHistory ?? [])].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  if (history.length) return history;
  return [{ status: app.applicationStatus, at: app.createdAt, kind: "created" }];
}

function doneBy(step: Step, ownerId: string): string {
  if (!step.byId) return "";
  return String(step.byId) === String(ownerId) ? "Self" : step.byName || "Admin";
}

function detailOf(step: Step, app: Application): string {
  if (step.status === "Submitted") {
    const via = app.submissionMethod || app.platform;
    return via ? `Via ${via}` : "";
  }
  if (step.kind === "observed_baseline") return "Tracking started";
  return "";
}

export default function ApplicationTimeline({ application }: { application: Application }) {
  const steps = stepsOf(application);
  const last = steps.length - 1;

  return (
    <div>
      <p className="text-muted mb-3 text-xs font-medium uppercase tracking-wide">Progress</p>
      <ol className="relative">
        {steps.map((step, i) => {
          const by = doneBy(step, application.userId);
          const detail = detailOf(step, application);
          return (
            <li key={`${step.status}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
              {i < last && (
                <span aria-hidden className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-[var(--border)]" />
              )}
              <span
                className={`role-badge ${STATUS_CLASS[step.status] ?? "status-wishlist"} relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-0`}
              >
                {STATUS_ICON[step.status] ?? <Flag size={14} />}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium leading-tight">
                  {step.status}
                  {detail && <span className="text-muted font-normal"> ({detail})</span>}
                  {i === last && (
                    <span className="ml-1.5 rounded-full border px-1.5 py-px align-middle text-[10px] font-normal">Current</span>
                  )}
                </p>
                <p className="text-muted mt-0.5 text-xs">
                  {[formatWhen(step.at), by].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
