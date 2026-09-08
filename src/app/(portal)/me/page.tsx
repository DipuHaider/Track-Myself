"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Briefcase, Copy, Ghost, Star, Send, MessageSquare,
  Trophy, XCircle, Clock, TrendingUp,
} from "lucide-react";
import type { Application } from "@/types/application";
import StatsModal from "@/components/applications/StatsModal";
import { computeDuplicateIds } from "@/lib/applicationFlags";
import RoleAvatar, { RoleIcon } from "@/components/shared/RoleAvatar";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

type Profile = { name: string; email: string; role: string; plan: string; bio: string };

/* ── stat card ── */
function StatCard({ label, value, icon, color, onClick }: {
  label: string; value: number; icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={`surface flex items-center gap-4 rounded-xl border p-4 transition hover:shadow-sm ${
        onClick ? "cursor-pointer select-none hover:-translate-y-0.5 hover:border-[var(--primary)] active:translate-y-0" : ""
      }`}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ background: color + "22", color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted text-xs">{label}</p>
      </div>
    </div>
  );
}

/* ── status badge helpers ── */
const STATUS_CLASS: Record<string, string> = {
  Wishlist: "status-wishlist", Submitted: "status-submitted",
  "No Response": "status-no-resp", "Interview Scheduled": "status-interview",
  "Offer Received": "status-offer", Rejected: "status-rejected",
};
function badgeClass(s: string) {
  return s.startsWith("Active") ? "status-active" : (STATUS_CLASS[s] ?? "status-wishlist");
}
function PriorityBadge({ p }: { p?: string }) {
  const cls = p === "High" ? "priority-high" : p === "Low" ? "priority-low" : "priority-medium";
  return <span className={`role-badge ${cls}`}>{p ?? "Medium"}</span>;
}

/* ── main ── */
export default function MePage() {
  const { data: session } = useSession();

  const [apps, setApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  /* profile edit */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profLoading, setProfLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  /* password */
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  /* stats modal */
  const [modal, setModal] = useState<{ title: string; apps: Application[] } | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setApps(d))
      .finally(() => setAppsLoading(false));
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => { setProfile(d); setEditName(d.name ?? ""); setEditBio(d.bio ?? ""); })
      .finally(() => setProfLoading(false));
  }, []);

  const stats = useMemo(() => {
    const c = (fn: (a: Application) => boolean) => apps.filter(fn).length;
    const dupIds = computeDuplicateIds(apps);
    return {
      total:       apps.length,
      wishlist:    c((a) => a.applicationStatus === "Wishlist"),
      submitted:   c((a) => a.applicationStatus === "Submitted"),
      interviews:  c((a) => a.applicationStatus.startsWith("Active") || a.applicationStatus === "Interview Scheduled"),
      offers:      c((a) => a.applicationStatus === "Offer Received"),
      rejected:    c((a) => a.applicationStatus === "Rejected"),
      noResponse:  c((a) => a.applicationStatus === "No Response"),
      favourites:  c((a) => !!a.favourite),
      ghostManual: c((a) => !!a.isGhostJob),
      duplicates:  dupIds.size,
      _dupIds:     dupIds,
    };
  }, [apps]);

  const displayName = profile?.name ?? session?.user?.name ?? "User";
  const role = (session?.user as { role?: string } | undefined)?.role ?? "free";
  const recent = apps.slice(0, 6);

  function openModal(title: string, filter: (a: Application) => boolean) {
    setModal({ title, apps: apps.filter(filter).slice(0, 10) });
  }

  const CARDS: { label: string; value: number; icon: React.ReactNode; color: string; filter: (a: Application) => boolean }[] = [
    // ── pipeline order ───────────────────────────────────────────────────────
    { label: "Total Applications", value: stats.total,       icon: <Briefcase size={20} />,    color: "#4169e1", filter: () => true },
    { label: "Favourites",         value: stats.favourites,  icon: <Star size={20} />,          color: "#f59e0b", filter: (a) => !!a.favourite },
    { label: "Wishlist",           value: stats.wishlist,    icon: <Star size={20} />,          color: "#e879f9", filter: (a) => a.applicationStatus === "Wishlist" },
    { label: "Submitted",          value: stats.submitted,   icon: <Send size={20} />,          color: "#3b82f6", filter: (a) => a.applicationStatus === "Submitted" },
    { label: "No Response",        value: stats.noResponse,  icon: <Clock size={20} />,         color: "#6b7280", filter: (a) => a.applicationStatus === "No Response" },
    { label: "Interviews",         value: stats.interviews,  icon: <MessageSquare size={20} />, color: "#8b5cf6", filter: (a) => a.applicationStatus.startsWith("Active") || a.applicationStatus === "Interview Scheduled" },
    { label: "Offers Received",    value: stats.offers,      icon: <Trophy size={20} />,        color: "#10b981", filter: (a) => a.applicationStatus === "Offer Received" },
    { label: "Rejected",           value: stats.rejected,    icon: <XCircle size={20} />,       color: "#ef4444", filter: (a) => a.applicationStatus === "Rejected" },
    { label: "Success Rate %",     value: stats.total ? Math.round((stats.offers / stats.total) * 100) : 0, icon: <TrendingUp size={20} />, color: "#06b6d4", filter: (a) => a.applicationStatus === "Offer Received" },
    { label: "Ghost Jobs",         value: stats.ghostManual, icon: <Ghost size={20} />,         color: "#be123c", filter: (a) => !!a.isGhostJob },
    { label: "Duplicates",         value: stats.duplicates,  icon: <Copy size={20} />,          color: "#c2410c", filter: (a) => stats._dupIds.has(a._id) },
  ];

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaveMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, bio: editBio }),
    });
    setSaving(false);
    if (res.ok) { const u = await res.json(); setProfile(u); setSaveMsg("Profile updated."); }
    else setSaveMsg("Failed to save.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) { setPwMsg("New password must be at least 6 characters."); return; }
    setPwSaving(true); setPwMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    setPwSaving(false);
    if (res.ok) { setPwMsg("Password changed."); setCurPw(""); setNewPw(""); }
    else { const d = await res.json(); setPwMsg(d.error ?? "Failed."); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">

      {/* ── Welcome ── */}
      <div className="flex items-center gap-4">
        <RoleAvatar
          name={displayName}
          image={session?.user?.image ?? ""}
          role={role}
          plan={profile?.plan}
          size={56}
        />
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {displayName}!</h1>
          <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
            <span className={`role-badge role-${role} inline-flex items-center gap-1`}>
              <RoleIcon role={role} plan={profile?.plan} size={11} />
              {ROLE_LABELS[role as Role] ?? role}
            </span>
            {profile?.plan && (
              <span className={`role-badge plan-${profile.plan}`}>
                {profile.plan === "premium" ? "Premium" : "Free"}
              </span>
            )}
            {apps.length > 0 && `· ${apps.length} application${apps.length !== 1 ? "s" : ""} tracked`}
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Your Stats
          </h2>
          <Link href="/me/applications" className="text-xs" style={{ color: "var(--primary)" }}>
            View all applications →
          </Link>
        </div>
        {appsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="surface h-20 animate-pulse rounded-xl border" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-muted mb-3 text-xs">Click a card to preview the last entries.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CARDS.map((c) => (
                <StatCard
                  key={c.label}
                  label={c.label}
                  value={c.value}
                  icon={c.icon}
                  color={c.color}
                  onClick={() => openModal(c.label, c.filter)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Recent applications ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Recent Applications
          </h2>
          <Link href="/me/applications" className="text-xs" style={{ color: "var(--primary)" }}>
            Manage all →
          </Link>
        </div>
        {appsLoading ? (
          <div className="surface h-40 animate-pulse rounded-xl border" />
        ) : recent.length === 0 ? (
          <div className="surface flex flex-col items-center justify-center gap-3 rounded-xl border py-12 text-center">
            <Briefcase size={30} className="text-muted" />
            <p className="font-medium">No applications yet</p>
            <Link href="/me/applications" className="btn-primary rounded-md px-4 py-2 text-sm">
              + Add your first application
            </Link>
          </div>
        ) : (
          <div className="surface overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="surface-muted">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Applied</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((app) => (
                  <tr key={app._id} className="border-t transition hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3 font-medium">{app.companyName}</td>
                    <td className="text-muted px-4 py-3">{app.jobTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`role-badge ${badgeClass(app.applicationStatus)}`}>
                        {app.applicationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge p={app.priority} /></td>
                    <td className="text-muted px-4 py-3">
                      {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Edit Profile ── */}
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-4 font-semibold">Edit Profile</h2>
        {profLoading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : (
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required minLength={2}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm opacity-60"
                value={profile?.email ?? ""}
                disabled
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Bio</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
                placeholder="Tell us a bit about yourself…"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </div>
            {saveMsg && (
              <p className={`text-sm ${saveMsg.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                {saveMsg}
              </p>
            )}
            <button
              type="submit" disabled={saving}
              className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </section>

      {/* ── Change Password ── */}
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-4 font-semibold">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Current Password</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">New Password</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required minLength={6}
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.includes("changed") ? "text-green-600" : "text-red-600"}`}>
              {pwMsg}
            </p>
          )}
          <button
            type="submit" disabled={pwSaving}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {pwSaving ? "Saving…" : "Change Password"}
          </button>
        </form>
      </section>

      {/* ── Stats modal ── */}
      {modal && (
        <StatsModal
          title={modal.title}
          applications={modal.apps}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  );
}
