"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import Loading from "@/components/shared/Spinner";
import { Switch } from "@/components/shared/A11ySettingsBody";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useProfile } from "@/hooks/useProfile";
import { isBackendRole } from "@/lib/permissions";
import {
  NOTIFICATION_TYPES, TYPE_HINTS, TYPE_LABELS, USER_NOTIFICATION_TYPES, type NotificationType,
} from "@/lib/notifications/types";

export default function NotificationsTab() {
  const { profile, loading, mutate } = useProfile();
  const [pending, setPending] = useState<NotificationType | null>(null);

  if (loading || !profile) return <Loading padded={false} className="py-10" />;

  const types = isBackendRole(profile.role) ? NOTIFICATION_TYPES : USER_NOTIFICATION_TYPES;
  const prefs = profile.notifPrefs ?? {};
  const isOn = (t: NotificationType) => prefs[t] !== false;

  const toggle = async (type: NotificationType) => {
    const next = { ...prefs, [type]: !isOn(type) };
    const previous = profile;
    setPending(type);
    await mutate({ ...profile, notifPrefs: next }, { revalidate: false });
    try {
      const saved = await apiFetch<typeof profile>("/api/user/profile", { method: "PATCH", json: { notifPrefs: next } });
      await mutate(saved, { revalidate: false });
    } catch (err) {
      await mutate(previous, { revalidate: false });
      toast.error(err instanceof ApiError ? err.message : "Could not save that preference.");
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Bell size={16} className="text-primary" aria-hidden="true" />
        In-app notifications
      </h2>
      <p className="text-muted mb-5 text-sm">
        Switch off anything you do not want in the bell. Nothing here sends email.
      </p>

      <ul className="divide-y">
        {types.map((type) => (
          <li key={type} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{TYPE_LABELS[type]}</p>
              <p className="text-muted text-xs">{TYPE_HINTS[type]}</p>
            </div>
            <Switch
              label={`${TYPE_LABELS[type]} notifications`}
              on={isOn(type)}
              disabled={pending === type}
              onChange={() => toggle(type)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
