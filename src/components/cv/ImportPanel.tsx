"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, FileUp, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import type { CVContent, CVFileMeta } from "@/types/cv";

type SourceReport = { label: string; kind: "file" | "json" | "form"; ok: boolean; detail: string };

export default function ImportPanel({
  files,
  isPremium,
  onImported,
}: {
  files: CVFileMeta[];
  isPremium: boolean;
  onImported: (content: CVContent, from: string) => void;
}) {
  const [sources, setSources] = useState<SourceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [showJson, setShowJson] = useState(false);

  const cvFiles = files.filter(
    (f) => !f.generated && (f.category === "cv" || f.category === "resume"),
  );

  /* setState lives in the promise callbacks, never in the effect body — bumping
     reloadKey is what re-runs it. The panel is informational, so a failed fetch
     just leaves the previous list in place. */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/user/cv/import")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (alive && body) setSources(Array.isArray(body.sources) ? body.sources : []);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]);

  const refresh = () => setReloadKey((n) => n + 1);

  async function readFile(id: string, name: string) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/user/cv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "file", fileId: id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not read that file.");
      onImported(body.content as CVContent, name);
      setMessage(`Read ${name} — found ${(body.found ?? []).join(", ") || "nothing usable"}.`);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(null);
    }
  }

  async function importJson() {
    if (!jsonText.trim()) return;
    setBusy("json");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/user/cv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "json", data: jsonText }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not import that JSON.");
      onImported(body.content as CVContent, body.label ?? "JSON");
      setMessage(`Imported as "${body.label}" — ${body.versions}/${body.limit ?? "∞"} versions stored.`);
      setJsonText("");
      setShowJson(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import that JSON.");
    } finally {
      setBusy(null);
    }
  }

  function onJsonFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setJsonText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <section className="surface rounded-xl border p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <FileUp size={16} style={{ color: "var(--primary)" }} aria-hidden="true" />
          Bring in existing details
        </h2>
        <button
          type="button"
          onClick={refresh}
          className="text-muted flex items-center gap-1 text-xs transition hover:text-[var(--foreground)]"
        >
          <RefreshCw size={11} aria-hidden="true" /> Refresh
        </button>
      </div>
      <p className="text-muted mb-4 text-sm">
        Read an uploaded CV and drop what it finds into the form below. Anything you have already
        typed wins — reading a file only fills the gaps.
      </p>

      {error && <p className="mb-3 flex items-start gap-1.5 text-sm text-red-600"><AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p>}
      {message && <p className="mb-3 flex items-start gap-1.5 text-sm" style={{ color: "#047857" }}><Check size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{message}</p>}

      {cvFiles.length === 0 ? (
        <p className="text-muted rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          No CV files uploaded yet. Add one in My Documents and it will show up here.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {cvFiles.map((file) => (
            <li key={file._id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-muted text-xs">
                  {file.category === "resume" ? "Resume" : "CV"} · {Math.max(1, Math.round(file.size / 1024))} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => readFile(file._id, file.name)}
                disabled={busy === file._id}
                className="shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-[var(--surface-2)] disabled:opacity-60"
              >
                {busy === file._id
                  ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  : "Read into form"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* what the generator will see */}
      <div className="mt-4">
        <p className="text-muted mb-1.5 text-xs font-medium uppercase tracking-wide">
          Sources used when generating
        </p>
        {loading ? (
          <Loader2 size={13} className="text-muted animate-spin" aria-hidden="true" />
        ) : sources.length === 0 ? (
          <p className="text-muted text-xs">Nothing yet — fill the form or upload a CV.</p>
        ) : (
          <ul className="space-y-1">
            {sources.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: s.ok ? "#10b981" : "#f59e0b" }}
                  aria-hidden="true"
                />
                <span>
                  <strong>{s.label}</strong>
                  <span className="text-muted"> — {s.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* JSON import */}
      {isPremium && (
        <div className="mt-5 border-t pt-4">
          {!showJson ? (
            <button
              type="button"
              onClick={() => setShowJson(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--surface-2)]"
            >
              <Upload size={12} aria-hidden="true" /> Import a CV version as JSON
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Import JSON</p>
                <label className="text-muted cursor-pointer text-xs underline underline-offset-2">
                  choose a .json file
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onJsonFile(f); }}
                  />
                </label>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={7}
                placeholder='{ "name": "…", "summary": "…", "experience": [ … ] }'
                className="w-full rounded-md border px-3 py-2 font-mono text-xs"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", maxHeight: "35dvh" }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={importJson}
                  disabled={busy === "json" || !jsonText.trim()}
                  className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {busy === "json" ? "Importing…" : "Import"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowJson(false); setJsonText(""); }}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setJsonText("")}
                  disabled={!jsonText}
                  className="text-muted flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs disabled:opacity-40"
                >
                  <Trash2 size={11} aria-hidden="true" /> Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
