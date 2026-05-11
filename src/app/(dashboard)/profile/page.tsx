"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Briefcase, Send, MessageSquare, Trophy,
  XCircle, Clock, TrendingUp, Star,
} from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import type { Application } from "@/types/application";

/* ── types ── */
type Profile = { _id: string; name: string; email: string; role: string; plan: string; bio: string };

/* ── stat card ── */
function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="surface flex items-center gap-4 rounded-xl border p-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: color + "22", color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-muted text-xs">{label}</p>
      </div>
    </div>
  );
}

/* ── main ── */
export default function ProfilePage() {
  const { data: session } = useSession();

  /* profile + apps state */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  /* edit profile state */
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  /* change password state */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
    ]).then(([prof, appsData]) => {
      setProfile(prof);
      setName(prof.name ?? "");
      setBio(prof.bio ?? "");
      setApps(Array.isArray(appsData) ? appsData : []);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const c = (fn: (a: Application) => boolean) => apps.filter(fn).length;
    return {
      total: apps.length,
      wishlist: c((a) => a.applicationStatus === "Wishlist"),
      submitted: c((a) => a.applicationStatus === "Submitted"),
      interviews: c((a) => a.applicationStatus.startsWith("Active") || a.applicationStatus === "Interview Scheduled"),
      offers: c((a) => a.applicationStatus === "Offer Received"),
      rejected: c((a) => a.applicationStatus === "Rejected"),
      noResponse: c((a) => a.applicationStatus === "No Response"),
    };
  }, [apps]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio }),
    });
    setSaving(false);
    if (res.ok) { const u = await res.json(); setProfile(u); setSaveMsg("Profile updated."); }
    else setSaveMsg("Failed to save.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { setPwMsg("New password must be at least 6 characters."); return; }
    setPwSaving(true); setPwMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPwSaving(false);
    if (res.ok) { setPwMsg("Password changed successfully."); setCurrentPassword(""); setNewPassword(""); }
    else { const d = await res.json(); setPwMsg(d.error ?? "Failed to change password."); }
  }

  if (loading) return <p className="text-muted text-sm">Loading…</p>;
  if (!profile) return <p className="text-sm text-red-600">Failed to load profile.</p>;

  const roleKey = profile.role as Role;
  const displayName = profile.name;
  const successRate = stats.total ? Math.round((stats.offers / stats.total) * 100) : 0;

  const CARDS = [
    { label: "Total Applications", value: stats.total,     icon: <Briefcase size={18} />,    color: "#4169e1" },
    { label: "Wishlist",           value: stats.wishlist,   icon: <Star size={18} />,         color: "#f59e0b" },
    { label: "Submitted",          value: stats.submitted,  icon: <Send size={18} />,         color: "#3b82f6" },
    { label: "Interviews",         value: stats.interviews, icon: <MessageSquare size={18} />,color: "#8b5cf6" },
    { label: "Offers",             value: stats.offers,     icon: <Trophy size={18} />,       color: "#10b981" },
    { label: "Rejected",           value: stats.rejected,   icon: <XCircle size={18} />,      color: "#ef4444" },
    { label: "No Response",        value: stats.noResponse, icon: <Clock size={18} />,        color: "#6b7280" },
    { label: "Success Rate %",     value: successRate,      icon: <TrendingUp size={18} />,   color: "#06b6d4" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* ── Welcome banner ── */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          {displayName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">Welcome, {displayName}</h1>
          <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
            <span className={`role-badge role-${profile.role}`}>{ROLE_LABELS[roleKey] ?? profile.role}</span>
            <span className={`role-badge plan-${profile.plan}`}>{profile.plan === "premium" ? "Premium" : "Free"}</span>
            {session?.user?.id && (
              <span className="text-muted text-xs">ID: {session.user.id.slice(-6)}</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Application Stats
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </section>

      {/* ── Edit profile ── */}
      <section className="surface rounded-xl border p-5">
        <h3 className="mb-4 font-semibold">Edit Profile</h3>
        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm opacity-60"
              value={profile.email}
              disabled
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bio</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              placeholder="Tell us a bit about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.includes("Failed") ? "text-red-600" : "text-green-600"}`}>{saveMsg}</p>
          )}
          <button
            type="submit" disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </section>

      {/* ── Change password ── */}
      <section className="surface rounded-xl border p-5">
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
              required minLength={6}
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>{pwMsg}</p>
          )}
          <button
            type="submit" disabled={pwSaving}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {pwSaving ? "Saving…" : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
