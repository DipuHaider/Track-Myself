"use client";

import { useId, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Pause, Play, ShieldAlert, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { apiFetch, ApiError } from "@/lib/api/client";
import { refreshProfile, useAccount } from "@/hooks/useProfile";

export default function AccountControls() {
  const { update } = useSession();
  const { account, mutate } = useAccount();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const confirmId = useId();
  const passwordId = useId();

  if (!account) return null;

  const paused = account.status === "paused";

  const toggle = async () => {
    const action = paused ? "resume" : "pause";
    if (action === "pause") {
      const ok = await confirm({
        title: "Pause your account?",
        message: "Adding or editing applications is frozen until you resume. Everything you saved stays readable, and the CV builder, documents and tools keep working.",
        confirmLabel: "Pause account",
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const body = await apiFetch<{ status: "active" | "paused"; message: string }>("/api/user/account", {
        method: "PATCH",
        json: { action },
      });
      await mutate({ ...account, status: body.status, pausedAt: body.status === "paused" ? new Date().toISOString() : null }, { revalidate: true });
      await refreshProfile();
      await update();
      toast.success(body.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update your account.");
    } finally {
      setBusy(false);
    }
  };

  const destroy = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/user/account", {
        method: "DELETE",
        json: { confirm: confirmText.trim(), password },
      });
      toast.success("Your account has been deleted.");
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the account.");
      setBusy(false);
    }
  };

  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 font-semibold">Account</h2>
      <p className="text-muted mb-5 text-sm">
        Pause tracking while you take a break, or erase everything permanently.
      </p>

      <div className={`alert ${paused ? "alert-warning" : ""} flex-wrap items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className={`icon-chip ${paused ? "alert-warning" : "surface-muted"}`}>
            {paused ? <Pause size={15} /> : <Play size={15} />}
          </span>
          <div>
            <p className="text-sm font-medium">{paused ? "Account is paused" : "Account is active"}</p>
            <p className={`text-xs leading-relaxed ${paused ? "opacity-90" : "text-muted"}`}>
              {paused
                ? `Adding or editing applications is frozen. Everything you saved is untouched and still readable${
                    account.pausedAt ? `, paused ${new Date(account.pausedAt).toLocaleDateString()}` : ""
                  }.`
                : "Pausing freezes application tracking. Your CV builder, documents and tools keep working."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${paused ? "btn-primary" : "btn-secondary"}`}
        >
          {busy
            ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            : paused ? "Resume account" : "Pause account"}
        </button>
      </div>

      <div className="alert alert-danger mt-4">
        <span aria-hidden="true" className="icon-chip alert-danger">
          <ShieldAlert size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Delete this account</p>
          <p className="mt-0.5 text-xs leading-relaxed opacity-90">
            Erases your account, every application and interview record, your CV profile and every
            uploaded document. This cannot be undone.
          </p>

          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="btn-danger mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              <Trash2 size={13} aria-hidden="true" /> Delete account
            </button>
          ) : (
            <div className="anim-in mt-4 space-y-3">
              <p className="flex items-start gap-2 text-xs">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                Download your data first — the export is just above, and CVs can be downloaded from the builder.
              </p>

              <div>
                <label htmlFor={confirmId} className="mb-1 block text-xs font-medium">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </label>
                <input
                  id={confirmId}
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  className="surface w-full rounded-md border px-3 py-2 font-mono text-sm text-[var(--foreground)]"
                />
              </div>

              {account.hasPassword && (
                <div>
                  <label htmlFor={passwordId} className="mb-1 block text-xs font-medium">Your password</label>
                  <input
                    id={passwordId}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="surface w-full rounded-md border px-3 py-2 text-sm text-[var(--foreground)]"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={destroy}
                  disabled={busy || confirmText.trim() !== "DELETE" || (account.hasPassword && !password)}
                  className="btn-danger inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {busy
                    ? <><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Deleting…</>
                    : <><Trash2 size={13} aria-hidden="true" /> Permanently delete</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmOpen(false); setConfirmText(""); setPassword(""); }}
                  className="btn-secondary rounded-lg px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
