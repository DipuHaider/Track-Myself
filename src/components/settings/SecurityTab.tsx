"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Check, Info, KeyRound, Loader2, LogOut, MailCheck, MailWarning, Minus } from "lucide-react";
import Loading from "@/components/shared/Spinner";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { ResendButton } from "@/components/auth/CheckInbox";
import { apiFetch, ApiError } from "@/lib/api/client";
import { refreshProfile, useProfile } from "@/hooks/useProfile";

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [saving, setSaving] = useState(false);
  const currentId = useId();
  const nextId = useId();
  const againId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (next !== again) {
      toast.error("The two new passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/user/profile", { method: "PATCH", json: { currentPassword: current, newPassword: next } });
      setCurrent("");
      setNext("");
      setAgain("");
      await refreshProfile();
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "use-reset") {
        toast.error("This account signs in with Google. Use “Forgot password” to set one.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not change the password.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor={currentId} className="mb-1 block text-sm font-medium">Current password</label>
        <input
          id={currentId}
          type="password"
          autoComplete="current-password"
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={nextId} className="mb-1 block text-sm font-medium">New password</label>
          <input
            id={nextId}
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            required
            aria-describedby={`${nextId}-hint`}
          />
          <p id={`${nextId}-hint`} className="text-muted mt-1 text-xs">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor={againId} className="mb-1 block text-sm font-medium">Repeat new password</label>
          <input
            id={againId}
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            minLength={8}
            required
          />
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-60">
        {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        {saving ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

export default function SecurityTab() {
  const { profile, loading } = useProfile();
  const confirm = useConfirm();
  const [revoking, setRevoking] = useState(false);

  if (loading || !profile) return <Loading padded={false} className="py-10" />;

  const signOutEverywhere = async () => {
    const ok = await confirm({
      title: "Sign out everywhere?",
      message: "Every device signed in to this account is signed out, including this one. You can sign back in straight away.",
      confirmLabel: "Sign out everywhere",
      tone: "danger",
    });
    if (!ok) return;
    setRevoking(true);
    try {
      await apiFetch("/api/user/account/sessions/revoke", { method: "POST" });
      toast.success("Signed out everywhere.");
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not sign out other sessions.");
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <KeyRound size={16} className="text-primary" aria-hidden="true" />
          Password
        </h2>
        {profile.hasPassword ? (
          <>
            <p className="text-muted mb-4 text-sm">Changing it signs out every other device.</p>
            <PasswordForm />
          </>
        ) : (
          <div className="alert alert-info mt-3">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              This account signs in with Google and has no password yet. To add one, use{" "}
              <Link href="/forgot-password" className="font-medium underline">Forgot password</Link> — the emailed link proves it is really you.
              Google keeps working either way.
            </p>
          </div>
        )}
      </section>

      <section className="surface rounded-xl border p-5">
        <h2 className="mb-3 font-semibold">Sign-in methods</h2>
        <dl className="divide-y text-sm">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt>Email and password</dt>
            <dd className="flex items-center gap-1.5">
              {profile.hasPassword
                ? <><Check size={15} className="text-success" aria-hidden="true" /> Set</>
                : <><Minus size={15} className="text-muted" aria-hidden="true" /> <span className="text-muted">Not set</span></>}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt>Connected sign-in: Google</dt>
            <dd className="flex items-center gap-1.5">
              {profile.googleLinked
                ? <><Check size={15} className="text-success" aria-hidden="true" /> Connected</>
                : <><Minus size={15} className="text-muted" aria-hidden="true" /> <span className="text-muted">Not connected</span></>}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <dt className="flex items-center gap-2">
              Email verification
            </dt>
            <dd className="flex flex-wrap items-center gap-3">
              {profile.emailVerified ? (
                <span className="flex items-center gap-1.5">
                  <MailCheck size={15} className="text-success" aria-hidden="true" />
                  Verified{profile.emailVerifiedAt ? ` ${new Date(profile.emailVerifiedAt).toLocaleDateString()}` : ""}
                </span>
              ) : (
                <>
                  <span className="text-warning flex items-center gap-1.5">
                    <MailWarning size={15} aria-hidden="true" />
                    Not verified
                  </span>
                  <ResendButton email={profile.email} label="Resend" />
                </>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="surface rounded-xl border p-5">
        <h2 className="mb-1 font-semibold">Sessions</h2>
        <p className="text-muted mb-4 text-sm">
          Lost a device, or signed in on a shared computer? This signs every session out at once.
        </p>
        <button
          type="button"
          onClick={signOutEverywhere}
          disabled={revoking}
          className="btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-60"
        >
          {revoking ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <LogOut size={14} aria-hidden="true" />}
          Sign out everywhere
        </button>
      </section>
    </div>
  );
}
