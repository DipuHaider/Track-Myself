export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { PLANS, ROLES, canDo } from "@/lib/permissions";
import { requireAction, forbidden } from "@/lib/serverAuth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAction("edit:users");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { role, plan } = body;

  if (role && !ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (plan && !PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await dbConnect();

  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only superadmin can touch a superadmin user or assign the superadmin role
  if (target.role === "superadmin" && !canDo(auth.role, "assign:superadmin")) {
    return forbidden("Only superadmin can modify another superadmin.");
  }
  if (role === "superadmin" && !canDo(auth.role, "assign:superadmin")) {
    return forbidden("Only superadmin can assign the superadmin role.");
  }

  const update: Record<string, string> = {};
  if (role) update.role = role;
  if (plan) update.plan = plan;

  const updated = await User.findByIdAndUpdate(id, update, { new: true, select: "-password" });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAction("delete:users");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (auth.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await dbConnect();

  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "superadmin" && !canDo(auth.role, "assign:superadmin")) {
    return forbidden("Only superadmin can delete a superadmin account.");
  }

  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
