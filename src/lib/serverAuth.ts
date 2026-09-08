import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  isAdmin, isEditor, isPremiumUser, isSuperAdmin,
  type AccountStatus, type DashboardAction, type Plan, type Role,
} from "@/lib/permissions";
import { canDoServer } from "@/lib/rbac";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export type SessionUser = {
  id: string;
  role: Role;
  plan: Plan;
  status: AccountStatus;
  email: string | null | undefined;
};

type RawSession = {
  user?: { id?: string; role?: string; plan?: string; status?: string; email?: string | null };
} | null;

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await getServerSession(authOptions)) as RawSession;
  const u = session?.user;
  if (!u?.id || !u?.role) return null;
  return {
    id: u.id,
    role: u.role as Role,
    plan: u.plan === "premium" ? "premium" : "free",
    status: u.status === "paused" ? "paused" : "active",
    email: u.email,
  };
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const forbidden = (msg = "Forbidden") => NextResponse.json({ error: msg }, { status: 403 });

export const accountPaused = () =>
  NextResponse.json(
    {
      error: "Your account is paused. Resume it from your profile to make changes.",
      status: "paused",
    },
    { status: 423 },
  );

export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  return user ?? unauthorized();
}

export async function liveStatus(userId: string): Promise<AccountStatus | null> {
  await dbConnect();
  const row = (await User.findById(userId, "status").lean()) as { status?: string } | null;
  if (!row) return null;
  return row.status === "paused" ? "paused" : "active";
}

export async function requireActiveAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.status === "paused") return accountPaused();
  return user;
}

export async function requirePremiumAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isPremiumUser(user.role, user.plan)) {
    return forbidden("This feature requires a Premium plan.");
  }
  return user;
}

const isReadAction = (action: DashboardAction) => action.startsWith("view:");

export async function requireAction(action: DashboardAction): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!(await canDoServer(user.role, action))) return forbidden();
  if (user.status === "paused" && !isReadAction(action)) return accountPaused();
  return user;
}

export async function requireEditorAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isEditor(user.role)) return forbidden();
  return user;
}

export async function requireAdminAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isAdmin(user.role)) return forbidden();
  return user;
}

export async function requireActiveAdminAuth(): Promise<SessionUser | NextResponse> {
  const user = await requireAdminAuth();
  if (user instanceof NextResponse) return user;
  if (user.status === "paused") return accountPaused();
  return user;
}

export async function requireSuperAdminAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isSuperAdmin(user.role)) return forbidden();
  return user;
}

export async function requireActiveSuperAdminAuth(): Promise<SessionUser | NextResponse> {
  const user = await requireSuperAdminAuth();
  if (user instanceof NextResponse) return user;
  if (user.status === "paused") return accountPaused();
  return user;
}
