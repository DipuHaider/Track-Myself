"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

type Profile = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  bio: string;
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appCount, setAppCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
    ]).then(([prof, apps]) => {
      setProfile(prof);
      setName(prof.name ?? "");
      setBio(prof.bio ?? "");
      setAppCount(Array.isArray(apps) ? apps.length : 0);
      setLoading(false);
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      setSaveMsg("Profile updated.");
    } else {
      setSaveMsg("Failed to save.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwMsg("New password must be at least 6 characters.");
      return;
    }
    setPwSaving(true);
    setPwMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPwSaving(false);
    if (res.ok) {
      setPwMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const data = await res.json();
      setPwMsg(data.error ?? "Failed to change password.");
    }
  }

  if (loading) {
    return <p className="text-muted text-sm">Loading...</p>;
  }

  if (!profile) {
    return <p className="text-sm text-red-600">Failed to load profile.</p>;
  }

  const roleKey = profile.role as Role;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-semibold">My Profile</h2>

      {/* Identity */}
      <section className="surface rounded-lg border p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-xl font-bold" style={{ background: "var(--surface-2)" }}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{profile.name}</p>
            <p className="text-muted text-sm">{profile.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`role-badge role-${profile.role}`}>
                {ROLE_LABELS[roleKey] ?? profile.role}
              </span>
              <span className={`role-badge plan-${profile.plan}`}>
                {profile.plan === "premium" ? "Premium Plan" : "Free Plan"}
              </span>
              {session?.user?.id && (
                <span className="role-badge role-general text-xs">
                  ID: {session.user.id.slice(-6)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <article className="surface rounded-lg border p-4">
          <p className="text-muted text-sm">Applications</p>
          <p className="text-primary mt-1 text-2xl font-semibold">{appCount}</p>
        </article>
        <article className="surface rounded-lg border p-4">
          <p className="text-muted text-sm">Plan</p>
          <p className="mt-1 text-xl font-semibold capitalize">{profile.plan}</p>
        </article>
        <article className="surface rounded-lg border p-4">
          <p className="text-muted text-sm">Role</p>
          <p className="mt-1 text-xl font-semibold">{ROLE_LABELS[roleKey] ?? profile.role}</p>
        </article>
      </section>

      {/* Edit profile */}
      <section className="surface rounded-lg border p-5">
        <h3 className="mb-4 font-semibold">Edit Profile</h3>
        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bio</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              placeholder="Tell us a bit about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
              {saveMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="surface rounded-lg border p-5">
        <h3 className="mb-4 font-semibold">Change Password</h3>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Current Password</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">New Password</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {pwMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={pwSaving}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {pwSaving ? "Saving..." : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
