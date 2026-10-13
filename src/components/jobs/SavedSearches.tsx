"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useJobSearches, type JobSearchRow } from "@/hooks/useJobHunt";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { JOB_SOURCES, JOB_SOURCE_LABELS, type JobSource } from "@/lib/jobs/constants";
import Loading from "@/components/shared/Spinner";

type Draft = {
  name: string;
  keywords: string;
  location: string;
  radiusKm: number;
  remote: boolean;
  sources: JobSource[];
  maxAgeDays: number;
  excludeCompanies: string;
  extensionUrls: string;
  active: boolean;
};

const EMPTY: Draft = {
  name: "", keywords: "", location: "", radiusKm: 25, remote: false, sources: ["ba", "adzuna"],
  maxAgeDays: 3, excludeCompanies: "", extensionUrls: "", active: true,
};

function toDraft(row: JobSearchRow): Draft {
  return {
    name: row.name,
    keywords: row.keywords,
    location: row.location,
    radiusKm: row.radiusKm,
    remote: row.remote,
    sources: row.sources as JobSource[],
    maxAgeDays: row.maxAgeDays,
    excludeCompanies: row.excludeCompanies.join(", "),
    extensionUrls: row.extensionUrls.join("\n"),
    active: row.active,
  };
}

function toBody(d: Draft) {
  return {
    ...d,
    name: d.name.trim() || d.keywords.trim().slice(0, 80),
    excludeCompanies: d.excludeCompanies.split(",").map((s) => s.trim()).filter(Boolean),
    extensionUrls: d.extensionUrls.split(/\s+/).map((s) => s.trim()).filter(Boolean),
  };
}

export default function SavedSearches() {
  const { searches, loading, mutate } = useJobSearches();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const confirm = useConfirm();

  if (loading) return <Loading padded={false} className="py-10" />;

  const remove = async (row: JobSearchRow) => {
    const ok = await confirm({ title: `Delete "${row.name}"?`, message: "Jobs it already found stay in your inbox.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/api/user/job-searches/${row._id}`, { method: "DELETE" });
      await mutate();
      toast.success("Search deleted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete that search.");
    }
  };

  return (
    <div className="space-y-4">
      {(searches ?? []).map((row) =>
        editing === row._id ? (
          <SearchForm
            key={row._id}
            initial={toDraft(row)}
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
              await apiFetch(`/api/user/job-searches/${row._id}`, { method: "PATCH", json: toBody(draft) });
              await mutate();
              setEditing(null);
              toast.success("Search saved.");
            }}
          />
        ) : (
          <article key={row._id} className="surface rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium">
                  {row.name}
                  {!row.active && <span className="text-muted ml-2 text-xs">(paused)</span>}
                </h3>
                <p className="text-muted text-sm">
                  “{row.keywords}”{row.location ? ` in ${row.location}, ${row.radiusKm} km` : " anywhere in Germany"}
                  {row.remote ? ", remote only" : ""} · posted in the last {row.maxAgeDays} day{row.maxAgeDays === 1 ? "" : "s"}
                </p>
                <p className="text-muted mt-1 text-xs">
                  Sources: {row.sources.map((s) => JOB_SOURCE_LABELS[s as JobSource] ?? s).join(", ")}
                  {row.lastRunAt && ` · last run ${new Date(row.lastRunAt).toLocaleString("en-GB")}`}
                  {row.lastRunSummary && ` · ${row.lastRunSummary.created ?? 0} new`}
                </p>
                {row.lastRunSummary?.errors?.length ? <p className="text-warning mt-1 text-xs">{row.lastRunSummary.errors[0]}</p> : null}
                {row.extensionUrls.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {row.extensionUrls.map((u) => (
                      <li key={u}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Open saved search on {new URL(u).hostname.replace(/^www\./, "")}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(row._id)} className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
                  <Pencil size={13} aria-hidden="true" /> Edit
                </button>
                <button type="button" onClick={() => remove(row)} className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
                  <Trash2 size={13} aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          </article>
        ),
      )}

      {editing === "new" ? (
        <SearchForm
          initial={EMPTY}
          onCancel={() => setEditing(null)}
          onSave={async (draft) => {
            await apiFetch("/api/user/job-searches", { method: "POST", json: toBody(draft) });
            await mutate();
            setEditing(null);
            toast.success("Search added. Press Search now in the inbox to run it.");
          }}
        />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
          <Plus size={14} aria-hidden="true" /> Add a saved search
        </button>
      )}
    </div>
  );
}

function SearchForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const id = useId();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (d.keywords.trim().length < 2) {
      toast.error("Add what you are looking for, for example \"Frontend Developer\".");
      return;
    }
    if (!d.sources.length) {
      toast.error("Pick at least one source.");
      return;
    }
    setSaving(true);
    try {
      await onSave(d);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save that search.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface space-y-3 rounded-xl border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-kw`} className="mb-1 block text-sm font-medium">What</label>
          <input id={`${id}-kw`} className="w-full rounded-md border px-3 py-2 text-sm" value={d.keywords} maxLength={200} required
            placeholder="Frontend Developer" onChange={(e) => set("keywords", e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-medium">Name <span className="text-muted font-normal">(optional)</span></label>
          <input id={`${id}-name`} className="w-full rounded-md border px-3 py-2 text-sm" value={d.name} maxLength={80}
            placeholder="Frontend in Hamburg" onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-loc`} className="mb-1 block text-sm font-medium">Where</label>
          <input id={`${id}-loc`} className="w-full rounded-md border px-3 py-2 text-sm" value={d.location} maxLength={120}
            placeholder="Hamburg (blank for all of Germany)" onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-radius`} className="mb-1 block text-sm font-medium">Radius (km)</label>
            <input id={`${id}-radius`} type="number" min={0} max={200} className="w-full rounded-md border px-3 py-2 text-sm"
              value={d.radiusKm} onChange={(e) => set("radiusKm", Number(e.target.value) || 0)} />
          </div>
          <div>
            <label htmlFor={`${id}-age`} className="mb-1 block text-sm font-medium">Posted within (days)</label>
            <input id={`${id}-age`} type="number" min={1} max={14} className="w-full rounded-md border px-3 py-2 text-sm"
              value={d.maxAgeDays} onChange={(e) => set("maxAgeDays", Math.min(14, Math.max(1, Number(e.target.value) || 3)))} />
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Sources</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {JOB_SOURCES.map((s) => (
            <label key={s} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={d.sources.includes(s)}
                onChange={() => set("sources", d.sources.includes(s) ? d.sources.filter((x) => x !== s) : [...d.sources, s])}
              />
              {JOB_SOURCE_LABELS[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.remote} onChange={(e) => set("remote", e.target.checked)} />
        Remote or home office only
      </label>

      <div>
        <label htmlFor={`${id}-urls`} className="mb-1 block text-sm font-medium">Saved searches on LinkedIn, XING or StepStone</label>
        <textarea id={`${id}-urls`} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" value={d.extensionUrls}
          aria-describedby={`${id}-urls-hint`} placeholder="https://www.linkedin.com/jobs/search/?keywords=…&f_TPR=r259200"
          onChange={(e) => set("extensionUrls", e.target.value)} />
        <p id={`${id}-urls-hint`} className="text-muted mt-1 text-xs">
          One link per line. Open one while signed in and press &quot;Send to TrackMyself&quot; in the extension to bring its
          results into your inbox. Nothing runs on those sites without you.
        </p>
      </div>

      <div>
        <label htmlFor={`${id}-ex`} className="mb-1 block text-sm font-medium">Skip these companies</label>
        <input id={`${id}-ex`} className="w-full rounded-md border px-3 py-2 text-sm" value={d.excludeCompanies}
          placeholder="Comma-separated" onChange={(e) => set("excludeCompanies", e.target.value)} />
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.active} onChange={(e) => set("active", e.target.checked)} />
        Run every morning
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Save search
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary rounded-md px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}
