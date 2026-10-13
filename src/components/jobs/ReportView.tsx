"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarClock, Lightbulb, ListChecks, Radar, Send, TrendingUp } from "lucide-react";
import Loading from "@/components/shared/Spinner";
import { FitChip, DeadlineBadge } from "@/components/jobs/LeadBadges";
import { TARGET_LABELS } from "@/components/jobs/TargetProgress";
import { TARGET_PLATFORMS } from "@/lib/jobs/settings";
import type { DailyReport, ReportLead } from "@/lib/jobs/report";

function LeadList({ leads, empty }: { leads: ReportLead[]; empty: string }) {
  if (!leads.length) return <p className="text-muted text-sm">{empty}</p>;
  return (
    <ul className="divide-y">
      {leads.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <Link href={`/me/jobs/${l.id}`} className="min-w-0 hover:underline">
            <span className="font-medium">{l.title}</span> <span className="text-muted">· {l.company} · {l.platform}</span>
          </Link>
          <span className="flex items-center gap-2">
            <DeadlineBadge deadline={l.deadline} />
            <FitChip score={l.fitScore} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon size={16} className="text-primary" aria-hidden="true" /> {title}</h2>
      {children}
    </section>
  );
}

export default function ReportView() {
  const { data, isLoading, error } = useSWR<DailyReport>("/api/user/job-hunt/report");
  if (isLoading) return <Loading padded={false} className="py-16" />;
  if (error || !data) return <div className="alert alert-danger" role="alert">Could not build the report.</div>;

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="space-y-5">
      <section className="surface rounded-xl border p-5">
        <p className="text-muted text-xs">Report for {new Date(data.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {data.summary.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </section>

      <Section icon={Send} title="Targets">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left text-xs">
                <th className="py-1 pr-3 font-medium">Platform</th>
                <th className="py-1 pr-3 font-medium">Daily target</th>
                <th className="py-1 pr-3 font-medium">Yesterday</th>
                <th className="py-1 font-medium">Today so far</th>
              </tr>
            </thead>
            <tbody>
              {TARGET_PLATFORMS.filter((p) => data.targets[p].target || data.targets[p].submittedYesterday || data.targets[p].submittedToday).map((p) => (
                <tr key={p} className="border-t">
                  <td className="py-1.5 pr-3">{TARGET_LABELS[p]}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{data.targets[p].target}</td>
                  <td className={`py-1.5 pr-3 tabular-nums ${data.targets[p].submittedYesterday >= data.targets[p].target && data.targets[p].target ? "text-success" : ""}`}>
                    {data.targets[p].submittedYesterday}
                  </td>
                  <td className="py-1.5 tabular-nums">{data.targets[p].submittedToday}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={ListChecks} title={`Ready for your review (${data.waiting.ready.length})`}>
        <LeadList leads={data.waiting.ready} empty="Nothing waiting. Prepare a few jobs from the inbox." />
        {data.waiting.applying.length > 0 && (
          <>
            <h3 className="text-muted mt-4 mb-1 text-xs font-medium tracking-wide uppercase">Opened but not marked submitted</h3>
            <LeadList leads={data.waiting.applying} empty="" />
          </>
        )}
        {data.waiting.failed.length > 0 && (
          <>
            <h3 className="text-danger mt-4 mb-1 text-xs font-medium tracking-wide uppercase">Preparation needs attention</h3>
            <LeadList leads={data.waiting.failed} empty="" />
          </>
        )}
      </Section>

      <Section icon={Radar} title={`New since yesterday (${data.newLeads.total})`}>
        <LeadList leads={data.newLeads.top} empty="No new jobs since yesterday. Check your saved searches or widen the radius." />
        {data.newLeads.total > data.newLeads.top.length && (
          <Link href="/me/jobs?status=new" className="text-primary mt-2 inline-block text-sm hover:underline">See all {data.newLeads.total}</Link>
        )}
      </Section>

      <Section icon={CalendarClock} title="Closing in the next three days">
        <LeadList leads={data.deadlines} empty="No deadlines coming up on open jobs." />
        {data.expiredYesterday > 0 && <p className="text-muted mt-2 text-xs">{data.expiredYesterday} job{data.expiredYesterday === 1 ? "" : "s"} expired yesterday.</p>}
      </Section>

      {data.followUps.length > 0 && (
        <Section icon={ListChecks} title="Tracked applications that need you">
          <ul className="divide-y">
            {data.followUps.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <Link href={`/me/applications?open=${r.id}`} className="font-medium hover:underline">{r.company} — {r.jobTitle}</Link>
                <p className="text-muted text-xs">{r.suggestion}</p>
              </li>
            ))}
          </ul>
          <p className="text-muted mt-2 text-xs">Overdue follow-ups are added to your to-do list once.</p>
        </Section>
      )}

      <Section icon={Lightbulb} title="What the numbers say">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {data.suggestions.map((s) => <li key={s}>{s}</li>)}
        </ul>
        {data.suggestionsMode === "ai" && <p className="text-muted mt-2 text-xs">Worded by AI from your numbers only.</p>}
      </Section>

      <Section icon={TrendingUp} title={`Last ${data.feedback.windowDays} days`}>
        {data.feedback.byPlatform.length === 0 ? (
          <p className="text-muted text-sm">No submitted applications in this window yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-left text-xs">
                  <th className="py-1 pr-3 font-medium">Platform</th>
                  <th className="py-1 pr-3 font-medium">Applied</th>
                  <th className="py-1 pr-3 font-medium">Replied</th>
                  <th className="py-1 pr-3 font-medium">Interviews</th>
                  <th className="py-1 font-medium">Reply rate</th>
                </tr>
              </thead>
              <tbody>
                {data.feedback.byPlatform.map((p) => (
                  <tr key={p.platform} className="border-t">
                    <td className="py-1.5 pr-3">{p.platform}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{p.applied}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{p.responded}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{p.interviewed}</td>
                    <td className="py-1.5 tabular-nums">{pct(p.responseRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-muted mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          {data.feedback.medianDaysToResponse != null && <span>Median wait for a reply: {data.feedback.medianDaysToResponse} days</span>}
          {data.feedback.weekTargetHitRate != null && <span>Targets reached this week: {pct(data.feedback.weekTargetHitRate)}</span>}
          {data.feedback.fitBands.map((b) => <span key={b.band}>Fit {b.band}: {pct(b.responseRate)} replied ({b.applied})</span>)}
        </div>
        <p className="text-muted mt-3 text-xs">
          A reply counts any move past Submitted, rejections included. For deeper analysis, open the insights notebook from Settings,
          Integrations.
        </p>
      </Section>
    </div>
  );
}
