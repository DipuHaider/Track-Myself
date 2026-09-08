"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { AlertTriangle, Loader2, Pause, Play, ShieldAlert, Trash2 } from "lucide-react";

type AccountState = {
  status: "active" | "paused";
  pausedAt: string | null;
  hasPassword: boolean;
};

export default function AccountControls() {
  const { update } = useSession();
  const [state, setState] = useState<AccountState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/user/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AccountState | null) => { if (alive && d) setState(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  async function toggle(action: "pause" | "resume") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Could not update your account.");
        return;
      }
      setState((prev) => (prev ? { ...prev, status: body.status } : prev));
      setMessage(body.message);
      await update();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText.trim(), password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Could not delete the account.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  const paused = state.status === "paused";

  return (
    <section className="surface rounded-xl border p-5">
      <h3 className="mb-1 font-semibold">Account</h3>
      <p className="text-muted mb-5 text-sm">
        Pause tracking while you take a break, or erase everything permanently.
      </p>

      {message && <p className="mb-4 text-sm" style={{ color: "#047857" }}>{message}</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Pause / resume */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
        style={paused
          ? { borderColor: "#f59e0b66", background: "#fffbeb" }
          : { borderColor: "var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={paused
              ? { background: "#f59e0b22", color: "#b45309" }
              : { background: "var(--surface-2)", color: "var(--muted-foreground)" }}
          >
            {paused ? <Pause size={15} /> : <Play size={15} />}
          </span>
          <div>
            <p className="text-sm font-medium" style={paused ? { color: "#92400e" } : undefined}>
              {paused ? "Account is paused" : "Account is active"}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: paused ? "#b45309" : "var(--muted-foreground)" }}>
              {paused
                ? `Adding or editing applications is frozen. Everything you saved is untouched and still readable${
                    state.pausedAt ? `, paused ${new Date(state.pausedAt).toLocaleDateString()}` : ""
                  }.`
                : "Pausing freezes application tracking. Your CV builder, documents and tools keep working."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggle(paused ? "resume" : "pause")}
          disabled={busy}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            paused ? "btn-primary" : "border hover:bg-[var(--surface-2)]"
          }`}
        >
          {busy
            ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            : paused ? "Resume account" : "Pause account"}
        </button>
      </div>

      {/* Delete */}
      <div className="mt-4 rounded-lg border p-4" style={{ borderColor: "#dc262633" }}>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "#dc262618", color: "#b91c1c" }}
          >
            <ShieldAlert size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Delete this account</p>
            <p className="text-muted mt-0.5 text-xs leading-relaxed">
              Erases your account, every application and interview record, your CV profile and every
              uploaded document. This cannot be undone.
            </p>

            {!confirmOpen ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                style={{ borderColor: "#dc262644" }}
              >
                <Trash2 size={13} aria-hidden="true" /> Delete account
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="flex items-start gap-2 text-xs" style={{ color: "#b91c1c" }}>
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Export anything you want to keep first — CVs can be downloaded from the builder.
                </p>

                <div>
                  <label className="text-muted mb-1 block text-xs font-medium">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                  />
                </div>

                {state.hasPassword && (
                  <div>
                    <label className="text-muted mb-1 block text-xs font-medium">Your password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={destroy}
                    disabled={busy || confirmText.trim() !== "DELETE"}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                    style={{ background: "#b91c1c" }}
                  >
                    {busy
                      ? <><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Deleting…</>
                      : <><Trash2 size={13} aria-hidden="true" /> Permanently delete</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmOpen(false); setConfirmText(""); setPassword(""); setError(""); }}
                    className="rounded-lg border px-4 py-2 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
