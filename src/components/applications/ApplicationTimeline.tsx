"use client";

import { useState, type ReactNode } from "react";
import {
  Ban, BellRing, CalendarClock, CircleDashed, Clock, Code, FileText, Flag, Heart, HeartHandshake, MessageSquareText,
  PenLine, PartyPopper, Send, Star, Trophy, Users, XCircle,
} from "lucide-react";
import { STATUS_CLASS } from "@/components/applications/StatusBadge";
import type { Application } from "@/types/application";
import { OFFER_RECEIVED_STATUS, WARM_LEAD_FEEDBACK, responseOptionsFor } from "@/constants/applicationStatus";

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

type Step = {
  status: string; at?: string | Date; kind: string; byId?: string; byName?: string; note?: string; value?: string;
};

const RESPONSE_LOOK: Record<string, { icon: ReactNode; cls: string }> = {
  [WARM_LEAD_FEEDBACK]:   { icon: <Heart size={14} />,             cls: "status-offer" },
  "Verbal offer":         { icon: <MessageSquareText size={14} />, cls: "status-active" },
  "Written offer":        { icon: <FileText size={14} />,          cls: "status-active" },
  "Negotiating":          { icon: <MessageSquareText size={14} />, cls: "status-interview" },
  "Accepted":             { icon: <PartyPopper size={14} />,       cls: "status-offer" },
  "Declined by me":       { icon: <XCircle size={14} />,           cls: "status-wishlist" },
  "Withdrawn by company": { icon: <Ban size={14} />,               cls: "status-rejected" },
};

function formatWhen(d?: string | Date) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDay(d?: string | Date) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function stepsOf(app: Application): Step[] {
  const history: Step[] = app.statusHistory?.length
    ? [...app.statusHistory]
    : [{ status: app.applicationStatus, at: app.createdAt, kind: "created" }];
  if (app.responseStatus && responseOptionsFor(app.applicationStatus).includes(app.responseStatus)) {
    const prefix = app.applicationStatus === OFFER_RECEIVED_STATUS ? "Offer" : "Feedback";
    history.push({
      value: app.responseStatus,
      status: `${prefix}: ${app.responseStatus}`,
      at: app.responseAt ?? app.updatedAt,
      kind: "feedback",
      note: app.responseNote,
    });
  }
  return history.sort((a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime());
}

function doneBy(step: Step, ownerId: string): string {
  if (!step.byId) return "";
  return String(step.byId) === String(ownerId) ? "Self" : step.byName || "Admin";
}

function iconFor(step: Step): ReactNode {
  if (step.kind === "feedback") return RESPONSE_LOOK[step.value ?? ""]?.icon ?? <MessageSquareText size={14} />;
  return STATUS_ICON[step.status] ?? <Flag size={14} />;
}

function classFor(step: Step): string {
  if (step.kind === "feedback") return RESPONSE_LOOK[step.value ?? ""]?.cls ?? "status-wishlist";
  return STATUS_CLASS[step.status] ?? "status-wishlist";
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
  const [now] = useState(() => Date.now());
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
                className={`role-badge ${classFor(step)} relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-0`}
              >
                {iconFor(step)}
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
                  {[step.kind === "feedback" ? formatDay(step.at) : formatWhen(step.at), by].filter(Boolean).join(" · ")}
                </p>
                {step.note && <p className="text-muted mt-1 text-xs italic">&ldquo;{step.note}&rdquo;</p>}
              </div>
            </li>
          );
        })}
        {application.followUpDate && (
          <li className="relative flex gap-3 pt-5">
            <span aria-hidden className="absolute left-[13px] top-0 h-5 w-px border-l border-dashed border-[var(--border)]" />
            <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed">
              <BellRing size={14} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium leading-tight">
                Follow up
                {new Date(application.followUpDate).getTime() < now && (
                  <span className="ml-1.5 align-middle text-[10px] font-normal text-red-500">overdue</span>
                )}
              </p>
              <p className="text-muted mt-0.5 text-xs">
                {new Date(application.followUpDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
