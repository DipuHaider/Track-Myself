"use client";

import { useSyncExternalStore } from "react";
import { MailWarning, X } from "lucide-react";
import { ResendButton } from "@/components/auth/CheckInbox";
import { useProfile } from "@/hooks/useProfile";

const DISMISS_KEY = "tm-verify-banner-dismissed";
const DISMISS_EVENT = "tm-verify-banner";

function subscribe(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function VerifyEmailBanner({ className = "" }: { className?: string }) {
  const { profile } = useProfile();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);

  if (!profile || profile.emailVerified || profile.googleLinked || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  return (
    <div className={`alert alert-warning anim-in ${className}`} role="status">
      <MailWarning size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Verify your email address</p>
        <p className="mt-0.5 text-xs opacity-90">
          We sent a link to {profile.email}. Until it is confirmed you cannot reset your password by email.
        </p>
        <div className="mt-2">
          <ResendButton email={profile.email} />
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for now"
        className="shrink-0 rounded p-1 opacity-80 transition hover:opacity-100"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export default VerifyEmailBanner;
