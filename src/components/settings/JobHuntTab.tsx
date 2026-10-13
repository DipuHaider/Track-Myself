"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, Radar, Trash2 } from "lucide-react";
import Loading from "@/components/shared/Spinner";
import { Switch } from "@/components/shared/A11ySettingsBody";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useJobHuntSettings } from "@/hooks/useJobHunt";
import { TARGET_LABELS } from "@/components/jobs/TargetProgress";
import { AUTO_PREPARE_MAX, SCREENING_MAX, TARGET_MAX, TARGET_PLATFORMS, type ApplicantFacts, type JobHuntView } from "@/lib/jobs/settings";

const APPLICANT_FIELDS: { key: keyof ApplicantFacts; label: string; placeholder: string; autoComplete?: string }[] = [
  { key: "phone", label: "Phone", placeholder: "+49 …", autoComplete: "tel" },
  { key: "city", label: "City you live in", placeholder: "Hamburg", autoComplete: "address-level2" },
  { key: "salaryExpectation", label: "Salary expectation", placeholder: "65.000 € per year" },
  { key: "noticePeriod", label: "Notice period", placeholder: "1 month" },
  { key: "workPermit", label: "Work permit", placeholder: "EU Blue Card" },
  { key: "startDate", label: "Earliest start", placeholder: "Immediately" },
  { key: "linkedinUrl", label: "LinkedIn profile", placeholder: "https://www.linkedin.com/in/…", autoComplete: "url" },
  { key: "websiteUrl", label: "Website or portfolio", placeholder: "https://…", autoComplete: "url" },
];

export default function JobHuntTab() {
  const { data, loading, mutate } = useJobHuntSettings();
  if (loading || !data) return <Loading padded={false} className="py-10" />;
  if (!data.allowed) {
    return (
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Radar size={16} aria-hidden="true" /> Job hunt</h2>
        <p className="text-muted text-sm">
          Daily job search, prepared applications and the daily report are not on your plan yet.{" "}
          <Link href="/pricing" className="text-primary hover:underline">See plans</Link>.
        </p>
      </section>
    );
  }
  return <JobHuntForm key={JSON.stringify(data.settings)} settings={data.settings} onSaved={(s) => mutate({ allowed: true, settings: s }, { revalidate: false })} />;
}

function JobHuntForm({ settings, onSaved }: { settings: JobHuntView; onSaved: (s: JobHuntView) => void }) {
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);
  const id = useId();
  const dirty = JSON.stringify(s) !== JSON.stringify(settings);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<{ settings: JobHuntView }>("/api/user/job-hunt", {
        method: "PUT",
        json: {
          enabled: s.enabled,
          dailyTargets: s.dailyTargets,
          autoPrepareTop: s.autoPrepareTop,
          minFitForAutoPrepare: s.minFitForAutoPrepare,
          reportEmail: s.reportEmail,
          applicant: s.applicant,
          screeningAnswers: s.screeningAnswers.filter((a) => a.question.trim() && a.answer.trim()),
        },
      });
      onSaved(res.settings);
      toast.success("Job hunt settings saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save your settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 flex items-center gap-2 font-semibold"><Radar size={16} aria-hidden="true" /> Daily job hunt</h2>
            <p className="text-muted text-sm">
              Every morning your <Link href="/me/jobs/searches" className="text-primary hover:underline">saved searches</Link> run,
              new jobs land in your <Link href="/me/jobs" className="text-primary hover:underline">job inbox</Link>, and you get a report.
              Nothing is ever submitted without you.
            </p>
          </div>
          <Switch label="Run the daily job hunt" on={s.enabled} onChange={() => setS({ ...s, enabled: !s.enabled })} />
        </div>
      </section>

      <section className="surface rounded-xl border p-5">
        <h3 className="mb-1 font-semibold">Daily targets</h3>
        <p className="text-muted mb-4 text-sm">How many applications you want to send each day, per site. Platforms count by where you apply.</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {TARGET_PLATFORMS.map((p) => (
            <div key={p}>
              <label htmlFor={`${id}-t-${p}`} className="mb-1 block text-sm font-medium">{TARGET_LABELS[p]}</label>
              <input
                id={`${id}-t-${p}`}
                type="number"
                min={0}
                max={TARGET_MAX}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={s.dailyTargets[p]}
                onChange={(e) => setS({ ...s, dailyTargets: { ...s.dailyTargets, [p]: Math.min(TARGET_MAX, Math.max(0, Number(e.target.value) || 0)) } })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="surface rounded-xl border p-5">
        <h3 className="mb-1 font-semibold">Prepare automatically</h3>
        <p className="text-muted mb-4 text-sm">
          After the morning search, prepare a tailored CV and cover letter for the best-fitting new jobs so they are ready to
          review. Each one uses AI from your allowance unless you have your own key. 0 turns this off.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-auto`} className="mb-1 block text-sm font-medium">Per site, up to</label>
            <input id={`${id}-auto`} type="number" min={0} max={AUTO_PREPARE_MAX} className="w-full rounded-md border px-3 py-2 text-sm"
              value={s.autoPrepareTop}
              onChange={(e) => setS({ ...s, autoPrepareTop: Math.min(AUTO_PREPARE_MAX, Math.max(0, Number(e.target.value) || 0)) })} />
          </div>
          <div>
            <label htmlFor={`${id}-minfit`} className="mb-1 block text-sm font-medium">Only when fit is at least</label>
            <input id={`${id}-minfit`} type="number" min={0} max={100} className="w-full rounded-md border px-3 py-2 text-sm"
              value={s.minFitForAutoPrepare}
              onChange={(e) => setS({ ...s, minFitForAutoPrepare: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
          </div>
        </div>
      </section>

      <section className="surface rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="mb-1 font-semibold">Daily report by email</h3>
            <p className="text-muted text-sm">New jobs, what is waiting for you, deadlines and feedback on what is working. It is always in the app too.</p>
          </div>
          <Switch label="Email the daily report" on={s.reportEmail} onChange={() => setS({ ...s, reportEmail: !s.reportEmail })} />
        </div>
      </section>

      <section className="surface rounded-xl border p-5">
        <h3 className="mb-1 font-semibold">Application details</h3>
        <p className="text-muted mb-4 text-sm">The extension fills these into application forms. Your name and email come from your profile.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {APPLICANT_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`${id}-a-${f.key}`} className="mb-1 block text-sm font-medium">{f.label}</label>
              <input
                id={`${id}-a-${f.key}`}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={s.applicant[f.key]}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete}
                maxLength={f.key.endsWith("Url") ? 300 : 120}
                onChange={(e) => setS({ ...s, applicant: { ...s.applicant, [f.key]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="surface rounded-xl border p-5">
        <h3 className="mb-1 font-semibold">Screening answers</h3>
        <p className="text-muted mb-4 text-sm">
          Answers to questions forms keep asking, such as &quot;Do you need a visa?&quot;. The extension only uses an answer when the
          question clearly matches, and highlights everything else for you.
        </p>
        <ul className="space-y-2">
          {s.screeningAnswers.map((a, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="sr-only" htmlFor={`${id}-q-${i}`}>Question {i + 1}</label>
              <input id={`${id}-q-${i}`} className="rounded-md border px-3 py-2 text-sm" placeholder="Question" value={a.question} maxLength={300}
                onChange={(e) => setS({ ...s, screeningAnswers: s.screeningAnswers.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} />
              <label className="sr-only" htmlFor={`${id}-ans-${i}`}>Answer {i + 1}</label>
              <input id={`${id}-ans-${i}`} className="rounded-md border px-3 py-2 text-sm" placeholder="Answer" value={a.answer} maxLength={1000}
                onChange={(e) => setS({ ...s, screeningAnswers: s.screeningAnswers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })} />
              <button type="button" aria-label={`Remove answer ${i + 1}`} className="btn-secondary rounded-md px-3 py-2"
                onClick={() => setS({ ...s, screeningAnswers: s.screeningAnswers.filter((_, j) => j !== i) })}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {s.screeningAnswers.length < SCREENING_MAX && (
          <button type="button" className="btn-secondary mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm"
            onClick={() => setS({ ...s, screeningAnswers: [...s.screeningAnswers, { question: "", answer: "" }] })}>
            <Plus size={14} aria-hidden="true" /> Add an answer
          </button>
        )}
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button type="button" onClick={save} disabled={!dirty || saving} className="btn-primary inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm shadow">
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Save job hunt settings
        </button>
      </div>
    </div>
  );
}
