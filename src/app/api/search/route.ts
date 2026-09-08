export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import CVFile from "@/models/CVFile";
import User from "@/models/User";
import { getSessionUser } from "@/lib/serverAuth";
import { getAllowedActions } from "@/lib/rbac";
import { isAdmin } from "@/lib/permissions";
import {
  SEARCH_PAGES, pageMatches,
  type SearchGroupKey, type SearchPage,
} from "@/lib/searchIndex";

const LIMIT_PER_GROUP = 5;

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  group: SearchGroupKey;
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function visible(page: SearchPage, signedIn: boolean, actions: string[], admin: boolean) {
  switch (page.visibility.type) {
    case "public": return true;
    case "guest":  return !signedIn;
    case "auth":   return signedIn;
    case "admin":  return admin;
    case "action": return actions.includes(page.visibility.action);
  }
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ hits: [], scope: "empty" });

  const needle = q.toLowerCase();
  const user = await getSessionUser();
  const signedIn = Boolean(user);
  const actions = user ? await getAllowedActions(user.role) : [];
  const admin = isAdmin(user?.role);

  const hits: SearchHit[] = SEARCH_PAGES
    .filter((page) => visible(page, signedIn, actions, admin) && pageMatches(page, needle))
    .slice(0, 12)
    .map((page) => ({
      id: page.href,
      title: page.title,
      subtitle: page.subtitle,
      href: page.href,
      group: page.group,
    }));

  if (!user) {
    return NextResponse.json({ hits, scope: "public" });
  }

  await dbConnect();

  const rx = { $regex: escapeRegex(q), $options: "i" };
  const canSeeAllApplications = actions.includes("view:applications");
  const canSeeUsers = actions.includes("view:users");

  const appFilter: Record<string, unknown> = {
    $or: [{ companyName: rx }, { jobTitle: rx }, { location: rx }, { country: rx }, { notes: rx }],
  };
  if (!canSeeAllApplications) appFilter.userId = user.id;

  const [applications, files, users] = await Promise.all([
    Application.find(appFilter, "companyName jobTitle applicationStatus userId")
      .sort({ createdAt: -1 })
      .limit(LIMIT_PER_GROUP)
      .lean(),
    CVFile.find({ userId: user.id, name: rx }, "name category mimeType")
      .limit(LIMIT_PER_GROUP)
      .lean(),
    canSeeUsers
      ? User.find({ $or: [{ name: rx }, { email: rx }] }, "name email role plan")
          .limit(LIMIT_PER_GROUP)
          .lean()
      : Promise.resolve([]),
  ]);

  const ownerIds = canSeeAllApplications
    ? [...new Set(applications.map((a) => String(a.userId)).filter((id) => id !== user.id))]
    : [];

  const owners = ownerIds.length
    ? ((await User.find({ _id: { $in: ownerIds } }, "name").lean()) as unknown as
        { _id: unknown; name: string }[])
    : [];
  const ownerById = new Map(owners.map((o) => [String(o._id), o.name]));

  for (const app of applications) {
    const ownerId = String(app.userId);
    const mine = ownerId === user.id;
    const ownerName = mine ? "You" : ownerById.get(ownerId) ?? "Another user";

    hits.push({
      id: String(app._id),
      title: app.companyName as string,
      subtitle: canSeeAllApplications
        ? `${app.jobTitle} · ${ownerName}`
        : (app.jobTitle as string),
      href: mine
        ? `/me/applications?q=${encodeURIComponent(app.companyName as string)}`
        : `/applications?q=${encodeURIComponent(app.companyName as string)}`,
      badge: app.applicationStatus as string,
      group: "applications",
    });
  }

  for (const file of files) {
    hits.push({
      id: String(file._id),
      title: file.name as string,
      subtitle: String(file.category ?? "other").replace("-", " "),
      href: "/me/my-cv",
      group: "documents",
    });
  }

  for (const row of users as unknown as { _id: unknown; name: string; email: string; role: string; plan: string }[]) {
    hits.push({
      id: String(row._id),
      title: row.name,
      subtitle: row.email,
      href: "/dashboard/users",
      badge: row.role,
      group: "users",
    });
  }

  return NextResponse.json({ hits, scope: canSeeAllApplications ? "platform" : "account" });
}
