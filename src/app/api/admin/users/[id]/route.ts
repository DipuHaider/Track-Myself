export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { notify } from "@/lib/notifications/create";
import { ACCOUNT_STATUSES, PLANS, ROLES, canAssignRole, canDo, canManageRole } from "@/lib/permissions";
import { requireAction, forbidden } from "@/lib/serverAuth";
import { purgeUserData } from "@/lib/accountDeletion";
import { invalidateClaims } from "@/lib/auth";
import { parseObjectId } from "@/lib/objectId";
import { USER_ADMIN_SELECT, adminUserRow } from "@/lib/serialisers/user";
import { recordAdminAction } from "@/lib/audit";
import { applyBillingEvent } from "@/lib/billing/apply";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAction("edit:users");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!parseObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auth.id === id) {
    return NextResponse.json({ error: "Edit your own account from your profile, not from here." }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const { role, plan, status } = body;

  if (role && !ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (plan && !PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (status && !ACCOUNT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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
  if (!canManageRole(auth.role, target.role)) {
    return forbidden("You can only manage accounts below your own role.");
  }
  if (role && !canAssignRole(auth.role, role)) {
    return forbidden("You can only assign roles below your own.");
  }

  const update: Record<string, unknown> = {};
  if (role) update.role = role;
  if (status) {
    update.status = status;
    update.pausedAt = status === "paused" ? new Date() : null;
  }

  /* Plan changes go through the billing layer so a manual admin toggle and a
     future payment webhook leave the same User.billing trail and notification. */
  if (plan && plan !== target.plan) {
    await applyBillingEvent({ userId: id, plan, status: plan === "premium" ? "active" : "none" }, "manual");
    update.plan = plan;
  }

  const updated = Object.keys(update).length
    ? await User.findByIdAndUpdate(id, update, { new: true, select: USER_ADMIN_SELECT })
    : await User.findById(id, USER_ADMIN_SELECT);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const changes: string[] = [];
  if (role && role !== target.role) changes.push(`your role is now ${role}`);
  if (status && status !== target.status) {
    changes.push(status === "paused" ? "your account was paused" : "your account was reactivated");
  }

  if (changes.length) {
    await notify({
      userId: String(id),
      type: "account",
      title: "Your account changed",
      body: `${changes.join(", ")}.`,
      href: "/me",
    });
  }

  invalidateClaims(updated.email);
  await recordAdminAction({
    actor: auth, action: "user.update", targetType: "user", targetId: id, targetLabel: updated.email,
    before: { role: target.role, plan: target.plan, status: target.status }, after: update, req,
  });

  return NextResponse.json(adminUserRow(updated.toObject()));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAction("delete:users");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!parseObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await dbConnect();

  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "superadmin" && !canDo(auth.role, "assign:superadmin")) {
    return forbidden("Only superadmin can delete a superadmin account.");
  }

  const removed = await purgeUserData(id, target.email);
  await recordAdminAction({
    actor: auth, action: "user.delete", targetType: "user", targetId: id, targetLabel: target.email,
    after: { userDeleted: removed.userDeleted, errors: removed.errors },
  });
  return NextResponse.json(
    { success: removed.userDeleted, retrying: !removed.userDeleted, removed },
    { status: removed.userDeleted ? 200 : 202 },
  );
}
