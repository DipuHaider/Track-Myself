export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

function requireAdminOrEditor(session: { user?: { role?: string } } | null) {
  const role = session?.user?.role;
  const allowed = role === "superadmin" || role === "admin" || role === "editor";
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const deny = requireAdminOrEditor(session as any);
  if (deny) return deny;

  await dbConnect();
  const users = await User.find({}, "-password").sort({ createdAt: -1 }).lean();
  return NextResponse.json(users);
}
