"use client";

import { useId, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AvatarUpload from "@/components/settings/AvatarUpload";
import Loading from "@/components/shared/Spinner";
import { apiFetch, ApiError } from "@/lib/api/client";
import { refreshProfile, useProfile, type ProfileView } from "@/hooks/useProfile";

function ProfileForm({ profile }: { profile: ProfileView }) {
  const { update } = useSession();
  const [name, setName] = useState(profile.name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const bioId = useId();

  const dirty = name.trim() !== (profile.name ?? "") || bio !== (profile.bio ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/user/profile", { method: "PATCH", json: { name: name.trim(), bio } });
      await refreshProfile();
      await update();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label htmlFor={nameId} className="mb-1 block text-sm font-medium">Name</label>
        <input
          id={nameId}
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={80}
          required
        />
      </div>
      <div>
        <label htmlFor={emailId} className="mb-1 block text-sm font-medium">Email</label>
        <input
          id={emailId}
          className="w-full rounded-md border px-3 py-2 text-sm opacity-60"
          value={profile.email}
          readOnly
          aria-describedby={`${emailId}-hint`}
        />
        <p id={`${emailId}-hint`} className="text-muted mt-1 text-xs">Your email is your sign-in and cannot be changed here.</p>
      </div>
      <div>
        <label htmlFor={bioId} className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          id={bioId}
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={4}
          maxLength={2000}
          placeholder="A line or two about what you are looking for."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="text-muted mt-1 text-xs">{bio.length}/2000</p>
      </div>
      <button
        type="submit"
        disabled={saving || !dirty}
        className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-60"
      >
        {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export default function ProfileTab() {
  const { profile, loading } = useProfile();

  if (loading || !profile) return <Loading padded={false} className="py-10" />;

  return (
    <div className="space-y-6">
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-1 font-semibold">Profile photo</h2>
        <p className="text-muted mb-4 text-sm">Shown in the header and on CV formats that carry a photo.</p>
        <AvatarUpload name={profile.name} image={profile.image} role={profile.role} plan={profile.plan} />
      </section>

      <section className="surface rounded-xl border p-5">
        <h2 className="mb-4 font-semibold">About you</h2>
        <ProfileForm key={profile._id} profile={profile} />
      </section>
    </div>
  );
}
