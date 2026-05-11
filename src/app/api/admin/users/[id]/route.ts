export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/permissions";

function requireAdmin(session: { user?: { id?: string; role?: string } } | null) {
  const role = session?.user?.role;
  if (!session?.user || (role !== "superadmin" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions as any);
  const deny = requireAdmin(session as any);
  if (deny) return deny;

  const { id } = await params;
  const body = await req.json();
  const { role, plan } = body;

  if (role && !ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await dbConnect();
  const actorRole = (session as { user?: { role?: string } } | null)?.user?.role;

  // Only superadmin can assign/edit superadmin users
  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "superadmin" && actorRole !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "superadmin" && actorRole !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, string> = {};
  if (role) update.role = role;
  if (plan) update.plan = plan;

  const user = await User.findByIdAndUpdate(id, update, { new: true, select: "-password" });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions as any);
  const deny = requireAdmin(session as any);
  if (deny) return deny;

  const { id } = await params;
  const adminSession = session as { user?: { id?: string; role?: string } } | null;
  if (adminSession?.user?.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await dbConnect();
  const target = await User.findById(id);
  if (target?.role === "superadmin" && adminSession?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
