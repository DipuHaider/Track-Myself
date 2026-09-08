export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminAuth, requireActiveAdminAuth } from "@/lib/serverAuth";
import {
  ACTION_DESCRIPTIONS,
  ACTION_LABELS,
  DASHBOARD_ACTIONS,
  LOCKED_ACTIONS,
  ROLES,
  ROLE_LABELS,
} from "@/lib/permissions";
import {
  defaultMatrix,
  getAccessControl,
  resetAccessMatrix,
  saveAccessMatrix,
} from "@/lib/rbac";

function payload(state: Awaited<ReturnType<typeof getAccessControl>>) {
  return {
    matrix: state.matrix,
    defaults: defaultMatrix(),
    updatedBy: state.updatedBy,
    updatedAt: state.updatedAt,
    roles: ROLES,
    roleLabels: ROLE_LABELS,
    actions: DASHBOARD_ACTIONS,
    actionLabels: ACTION_LABELS,
    actionDescriptions: ACTION_DESCRIPTIONS,
    lockedActions: LOCKED_ACTIONS,
  };
}

export async function GET() {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(payload(await getAccessControl(true)));
}

export async function PUT(req: Request) {
  const auth = await requireActiveAdminAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  if (!body?.matrix || typeof body.matrix !== "object") {
    return NextResponse.json({ error: "A matrix object is required." }, { status: 400 });
  }

  const state = await saveAccessMatrix(body.matrix as Record<string, unknown>, auth);
  return NextResponse.json(payload(state));
}

export async function DELETE() {
  const auth = await requireActiveAdminAuth();
  if (auth instanceof NextResponse) return auth;

  const state = await resetAccessMatrix(auth);
  return NextResponse.json(payload(state));
}
