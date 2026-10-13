"use client";

import { useId, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, Plug, Send, Trash2, Webhook } from "lucide-react";
import Loading from "@/components/shared/Spinner";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useJobHuntSettings } from "@/hooks/useJobHunt";
import { WEBHOOK_EVENTS, type JobHuntView, type WebhookEvent } from "@/lib/jobs/settings";

const SCOPES = [
  { key: "leads:read", label: "Read job leads" },
  { key: "leads:write", label: "Add, shortlist and dismiss leads" },
  { key: "hunt:run", label: "Run the job search" },
  { key: "prepare", label: "Prepare CVs and letters (uses AI)" },
  { key: "applications:read", label: "Read applications" },
  { key: "applications:write", label: "Update application status and notes" },
  { key: "report:read", label: "Read the daily report and insights" },
] as const;

const PRESETS: Record<string, string[]> = {
  "MCP server (Claude)": SCOPES.map((s) => s.key),
  "n8n automation": ["leads:read", "leads:write", "hunt:run", "report:read"],
  "Notebook (read-only)": ["leads:read", "applications:read", "report:read"],
};

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "lead.created": "New jobs found",
  "lead.ready": "Application ready for review",
  "application.submitted": "Application submitted",
  "report.daily": "Daily report",
};

type TokenRow = { _id: string; name: string; scopes: string[]; last4: string; lastUsedAt: string | null; expiresAt: string | null; createdAt: string };

export default function IntegrationsTab() {
  const { data, loading } = useJobHuntSettings();
  if (loading || !data) return <Loading padded={false} className="py-10" />;
  if (!data.allowed) {
    return (
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Plug size={16} aria-hidden="true" /> Integrations</h2>
        <p className="text-muted text-sm">API tokens and webhooks come with Job hunt, which is not on your plan yet.</p>
      </section>
    );
  }
  return (
    <div className="space-y-5">
      <Tokens />
      <WebhookSettings key={JSON.stringify(data.settings.webhook)} settings={data.settings} />
    </div>
  );
}

function Tokens() {
  const { data: rows, isLoading, mutate } = useSWR<TokenRow[]>("/api/user/api-tokens");
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(PRESETS["MCP server (Claude)"]);
  const [expires, setExpires] = useState<string>("90");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const id = useId();

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch<{ token: string }>("/api/user/api-tokens", {
        method: "POST",
        json: { name: name.trim() || "Automation", scopes, expiresInDays: expires === "never" ? null : Number(expires) },
      });
      setFresh(res.token);
      setName("");
      await mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the token.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (row: TokenRow) => {
    const ok = await confirm({ title: `Revoke "${row.name}"?`, message: "Anything using it stops working immediately.", confirmLabel: "Revoke", tone: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/api/user/api-tokens/${row._id}`, { method: "DELETE" });
      await mutate();
      toast.success("Token revoked.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not revoke the token.");
    }
  };

  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><KeyRound size={16} aria-hidden="true" /> API tokens</h2>
      <p className="text-muted mb-4 text-sm">
        For your MCP server, n8n and notebooks. They call the automation API at <code>/api/v1</code>. Tokens can triage and prepare,
        but approving and submitting an application always stays with you.
      </p>

      {fresh && (
        <div className="alert alert-success mb-4 flex-col" role="status">
          <p className="font-medium">Copy this token now. It is not shown again.</p>
          <div className="mt-2 flex w-full items-center gap-2">
            <code className="surface min-w-0 flex-1 truncate rounded border px-2 py-1 text-xs">{fresh}</code>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
              onClick={() => navigator.clipboard.writeText(fresh).then(() => toast.success("Copied."))}
            >
              <Copy size={12} aria-hidden="true" /> Copy
            </button>
          </div>
        </div>
      )}

      {isLoading ? <Loading padded={false} className="py-4" /> : (
        <ul className="mb-4 divide-y">
          {(rows ?? []).map((row) => (
            <li key={row._id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{row.name} <span className="text-muted font-normal">…{row.last4}</span></p>
                <p className="text-muted text-xs">
                  {row.scopes.join(", ")} · {row.lastUsedAt ? `last used ${new Date(row.lastUsedAt).toLocaleString("en-GB")}` : "never used"}
                  {row.expiresAt ? ` · expires ${new Date(row.expiresAt).toLocaleDateString("en-GB")}` : " · no expiry"}
                </p>
              </div>
              <button type="button" onClick={() => revoke(row)} className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
                <Trash2 size={13} aria-hidden="true" /> Revoke
              </button>
            </li>
          ))}
          {rows && rows.length === 0 && <li className="text-muted py-2 text-sm">No tokens yet.</li>}
        </ul>
      )}

      <form onSubmit={create} className="surface-muted space-y-3 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-medium">Name</label>
            <input id={`${id}-name`} className="w-full rounded-md border px-3 py-2 text-sm" value={name} maxLength={60}
              placeholder="Claude Desktop" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${id}-exp`} className="mb-1 block text-sm font-medium">Expires</label>
            <select id={`${id}-exp`} className="w-full rounded-md border px-3 py-2 text-sm" value={expires} onChange={(e) => setExpires(e.target.value)}>
              <option value="30">In 30 days</option>
              <option value="90">In 90 days</option>
              <option value="365">In a year</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([label, keys]) => (
            <button key={label} type="button" className="btn-secondary rounded-full px-3 py-1 text-xs" onClick={() => setScopes(keys)}>{label}</button>
          ))}
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Allowed to</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {SCOPES.map((s) => (
              <label key={s.key} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={scopes.includes(s.key)}
                  onChange={() => setScopes((prev) => (prev.includes(s.key) ? prev.filter((x) => x !== s.key) : [...prev, s.key]))} />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={busy || scopes.length === 0} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
          {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Create token
        </button>
      </form>
    </section>
  );
}

function WebhookSettings({ settings }: { settings: JobHuntView }) {
  const { mutate } = useJobHuntSettings();
  const [url, setUrl] = useState(settings.webhook.url);
  const [events, setEvents] = useState<WebhookEvent[]>(settings.webhook.events);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const id = useId();
  const dirty = url !== settings.webhook.url || events.join() !== settings.webhook.events.join();

  const call = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  };

  const save = () => call("save", async () => {
    const res = await apiFetch<{ allowed: boolean; settings: JobHuntView }>("/api/user/job-hunt", { method: "PUT", json: { webhook: { url, events } } });
    await mutate(res, { revalidate: false });
    toast.success("Webhook saved.");
  });
  const rotate = () => call("rotate", async () => {
    const res = await apiFetch<{ secret: string }>("/api/user/job-hunt/webhook", { method: "POST", json: { action: "rotate" } });
    setSecret(res.secret);
    await mutate();
  });
  const test = () => call("test", async () => {
    const res = await apiFetch<{ delivered: boolean; status: string }>("/api/user/job-hunt/webhook", { method: "POST", json: { action: "test" } })
      .catch((err) => {
        if (err instanceof ApiError) return { delivered: false, status: err.message };
        throw err;
      });
    if (res.delivered) toast.success(`Delivered (${res.status}).`);
    else toast.error(`Not delivered: ${res.status}`);
    await mutate();
  });

  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Webhook size={16} aria-hidden="true" /> Webhook</h2>
      <p className="text-muted mb-4 text-sm">
        A POST to your URL, for example an n8n Webhook node, when something happens. Each request carries an{" "}
        <code>X-TM-Signature</code> header, an HMAC-SHA256 of the body with your signing secret. Payloads hold headlines and links,
        never your CV or letters.
      </p>

      {secret && (
        <div className="alert alert-success mb-4 flex-col" role="status">
          <p className="font-medium">Your signing secret. Copy it now; it is not shown again.</p>
          <div className="mt-2 flex w-full items-center gap-2">
            <code className="surface min-w-0 flex-1 truncate rounded border px-2 py-1 text-xs">{secret}</code>
            <button type="button" className="btn-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
              onClick={() => navigator.clipboard.writeText(secret).then(() => toast.success("Copied."))}>
              <Copy size={12} aria-hidden="true" /> Copy
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor={`${id}-url`} className="mb-1 block text-sm font-medium">URL</label>
          <input id={`${id}-url`} type="url" className="w-full rounded-md border px-3 py-2 text-sm" value={url}
            placeholder="https://your-n8n.example.com/webhook/…" onChange={(e) => setUrl(e.target.value)} />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Send these events</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={events.includes(ev)}
                  onChange={() => setEvents((prev) => (prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]))} />
                {EVENT_LABELS[ev]} <code className="text-muted text-xs">{ev}</code>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-muted text-xs">
          Signing secret: {settings.webhook.hasSecret ? `set, ends in …${settings.webhook.last4}` : "not set yet"}
          {settings.webhook.lastAt && ` · last delivery ${new Date(settings.webhook.lastAt).toLocaleString("en-GB")}: ${settings.webhook.lastStatus}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={!dirty || busy !== null} className="btn-primary rounded-md px-4 py-2 text-sm">Save</button>
          <button type="button" onClick={rotate} disabled={busy !== null} className="btn-secondary rounded-md px-4 py-2 text-sm">
            {settings.webhook.hasSecret ? "Rotate secret" : "Create secret"}
          </button>
          <button type="button" onClick={test} disabled={busy !== null || !settings.webhook.url || !settings.webhook.hasSecret}
            className="btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
            {busy === "test" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />} Send a test
          </button>
        </div>
      </div>
    </section>
  );
}
