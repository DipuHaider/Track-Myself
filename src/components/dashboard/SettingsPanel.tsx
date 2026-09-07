"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Loader2, Play, Shield, XCircle } from "lucide-react";
import { PLAN_LABELS, ROLE_LABELS, type Plan, type Role } from "@/lib/permissions";

type SystemInfo = {
  env: {
    googleOAuth: boolean;
    nextAuthSecret: boolean;
    nextAuthUrl: boolean;
    aiTailoring: boolean;
    nodeEnv: string;
  };
  database: { name: string; readyState: number };
  counts: {
    users: number;
    byRole: Record<string, number>;
    byPlan: Record<string, number>;
    applications: number;
    cvProfiles: number;
    cvFiles: number;
    legacyEmbeddedProfiles: number;
  };
};

type TaskKey = "roles" | "cvFiles";

const TASKS: { key: TaskKey; label: string; description: string; endpoint: string }[] = [
  {
    key: "roles",
    label: "Migrate legacy roles",
    description: "Renames the old general/premium roles to free/paid and promotes the configured superadmin emails.",
    endpoint: "/api/migrate-roles",
  },
  {
    key: "cvFiles",
    label: "Move CV files to their own collection",
    description: "Moves uploaded CV file data out of each CV profile document into the CVFile collection, keeping the same file IDs.",
    endpoint: "/api/admin/migrate-cv-files",
  },
];

function Flag({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      {ok
        ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: "#0ca30c" }} aria-hidden="true" />
        : <XCircle size={15} className="mt-0.5 shrink-0" style={{ color: "#d03b3b" }} aria-hidden="true" />}
      <span className="text-sm">
        {label}
        <span className="text-muted"> — {ok ? "configured" : "not configured"}</span>
        {hint && !ok && <span className="text-muted block text-xs">{hint}</span>}
      </span>
    </li>
  );
}

function CountRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function SettingsPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [running, setRunning] = useState<TaskKey | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  function loadInfo() {
    return fetch("/api/admin/system")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SystemInfo | null) => {
        setInfo(d);
        setFailed(!d);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadInfo(); }, []);

  async function runTask(task: (typeof TASKS)[number]) {
    if (!confirm(`Run "${task.label}"? This updates records in the database.`)) return;
    setRunning(task.key);
    try {
      const res = await fetch(task.endpoint, { method: "POST" });
      const body = await res.json();
      setResults((prev) => ({
        ...prev,
        [task.key]: res.ok
          ? Object.entries(body).map(([k, v]) => `${k}: ${v}`).join(" · ")
          : (body?.error ?? "Failed."),
      }));
      if (res.ok) await loadInfo();
    } catch {
      setResults((prev) => ({ ...prev, [task.key]: "Request failed." }));
    } finally {
      setRunning(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="text-muted animate-spin" />
      </div>
    );
  }

  if (failed || !info) {
    return (
      <p className="surface rounded-lg border p-4 text-sm text-red-600">
        Could not load system information.
      </p>
    );
  }

  const { env, database, counts } = info;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-xl border p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Shield size={16} aria-hidden="true" />
            Configuration
          </h3>
          <ul className="divide-y" role="list">
            <Flag ok={env.nextAuthSecret} label="NextAuth secret" hint="Sessions will not persist without NEXTAUTH_SECRET." />
            <Flag ok={env.nextAuthUrl} label="NextAuth URL" hint="Set NEXTAUTH_URL for correct callback URLs in production." />
            <Flag ok={env.googleOAuth} label="Google sign-in" hint="Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." />
            <Flag ok={env.aiTailoring} label="AI CV tailoring" hint="Set ANTHROPIC_API_KEY to enable the premium AI Tailor." />
          </ul>
          <p className="text-muted mt-3 text-xs">
            Environment: <strong>{env.nodeEnv}</strong>
          </p>
        </div>

        <div className="surface rounded-xl border p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Database size={16} aria-hidden="true" />
            Data
          </h3>
          <CountRow label="Database" value={database.name} />
          <CountRow label="Connection" value={database.readyState === 1 ? "connected" : "not connected"} />
          <CountRow label="Users" value={counts.users} />
          <CountRow label="Applications" value={counts.applications} />
          <CountRow label="CV profiles" value={counts.cvProfiles} />
          <CountRow label="CV files" value={counts.cvFiles} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-xl border p-5">
          <h3 className="mb-3 font-semibold">Users by role</h3>
          {Object.entries(counts.byRole).map(([role, count]) => (
            <CountRow key={role} label={ROLE_LABELS[role as Role] ?? role} value={count} />
          ))}
        </div>
        <div className="surface rounded-xl border p-5">
          <h3 className="mb-3 font-semibold">Users by plan</h3>
          {Object.entries(counts.byPlan).map(([plan, count]) => (
            <CountRow key={plan} label={PLAN_LABELS[plan as Plan] ?? plan} value={count} />
          ))}
          <p className="text-muted mt-3 text-xs">
            Premium features follow the plan field; editors and above always have premium access.
            Plan changes apply to a signed-in user within five minutes.
          </p>
        </div>
      </section>

      {counts.legacyEmbeddedProfiles > 0 && (
        <div className="flex items-start gap-3 rounded-xl border p-4"
          style={{ borderColor: "#f59e0b66", background: "#fffbeb" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "#d97706" }} aria-hidden="true" />
          <p className="text-sm" style={{ color: "#92400e" }}>
            {counts.legacyEmbeddedProfiles} CV profile{counts.legacyEmbeddedProfiles === 1 ? " still stores" : "s still store"} file
            data inline. Run <strong>Move CV files to their own collection</strong> below to migrate them.
          </p>
        </div>
      )}

      <section className="surface rounded-xl border p-5">
        <h3 className="mb-1 font-semibold">Maintenance</h3>
        <p className="text-muted mb-4 text-sm">
          {isSuperAdmin
            ? "One-off data migrations. Each task is safe to run more than once."
            : "One-off data migrations. Only a superadmin can run these."}
        </p>

        <div className="space-y-3">
          {TASKS.map((task) => (
            <div key={task.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{task.label}</p>
                <p className="text-muted text-xs leading-relaxed">{task.description}</p>
                {results[task.key] && (
                  <p className="text-muted mt-1 text-xs">Result — {results[task.key]}</p>
                )}
              </div>
              <button
                type="button"
                disabled={!isSuperAdmin || running !== null}
                onClick={() => runTask(task)}
                title={isSuperAdmin ? undefined : "Superadmin only"}
                className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                {running === task.key
                  ? <><Loader2 size={13} className="animate-spin" /> Running…</>
                  : <><Play size={13} /> Run</>}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
