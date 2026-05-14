import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isAdmin, isEditor, isSuperAdmin, type Role } from "@/lib/permissions";

export type SessionUser = { id: string; role: Role; email: string | null | undefined };

type RawSession = { user?: { id?: string; role?: string; email?: string | null } } | null;

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await getServerSession(authOptions as any)) as RawSession;
  const u = session?.user;
  if (!u?.id || !u?.role) return null;
  return { id: u.id, role: u.role as Role, email: u.email };
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const forbidden = (msg = "Forbidden") => NextResponse.json({ error: msg }, { status: 403 });

export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  return user ?? unauthorized();
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
