import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  isAdmin, isEditor, isPremiumUser, isSuperAdmin,
  type DashboardAction, type Plan, type Role,
} from "@/lib/permissions";
import { canDoServer } from "@/lib/rbac";

export type SessionUser = {
  id: string;
  role: Role;
  plan: Plan;
  email: string | null | undefined;
};

type RawSession = {
  user?: { id?: string; role?: string; plan?: string; email?: string | null };
} | null;

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await getServerSession(authOptions)) as RawSession;
  const u = session?.user;
  if (!u?.id || !u?.role) return null;
  return {
    id: u.id,
    role: u.role as Role,
    plan: u.plan === "premium" ? "premium" : "free",
    email: u.email,
  };
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const forbidden = (msg = "Forbidden") => NextResponse.json({ error: msg }, { status: 403 });

export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  return user ?? unauthorized();
}

export async function requirePremiumAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isPremiumUser(user.role, user.plan)) {
    return forbidden("This feature requires a Premium plan.");
  }
  return user;
}

export async function requireAction(action: DashboardAction): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!(await canDoServer(user.role, action))) return forbidden();
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

export async function requireSuperAdminAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isSuperAdmin(user.role)) return forbidden();
  return user;
}
