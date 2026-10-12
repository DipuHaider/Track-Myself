export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { recordAdminAction } from "@/lib/audit";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import User from "@/models/User";
import { parseObjectId } from "@/lib/objectId";
import { historyActor, isValidationError, updateApplication, validationMessage } from "@/lib/applicationHistory";
import { softDeleteApplication } from "@/lib/applicationTrash";
import { requireAction } from "@/lib/serverAuth";

type Params = { params: Promise<{ id: string }> };

/* The list omits the heavy fields; the View and Edit modals fetch the whole row. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAction("view:applications");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!parseObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dbConnect();
  const app = (await Application.findById(id).setOptions({ withDeleted: true }).lean()) as
    | (Record<string, unknown> & { _id: unknown; userId: unknown })
    | null;
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const owner = (await User.findById(app.userId, "name email role plan").lean()) as
    | { _id: unknown; name: string; email: string; role: string; plan: string }
    | null;

  return NextResponse.json({
    ...app,
    _id: String(app._id),
    userId: String(app.userId),
    owner: owner ? { _id: String(owner._id), name: owner.name, email: owner.email, role: owner.role, plan: owner.plan } : null,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAction("edit:applications");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!parseObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await dbConnect();

  const body = await req.json();

  let updated;
  try {
    updated = await updateApplication({ _id: id }, body, () => historyActor(auth.id));
  } catch (err) {
    if (isValidationError(err)) return NextResponse.json({ error: validationMessage(err) }, { status: 400 });
    throw err;
  }
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAdminAction({ actor: auth, action: "application.update", targetType: "application", targetId: id, after: body as Record<string, unknown>, req });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAction("delete:applications");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!parseObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await dbConnect();

  const deleted = await softDeleteApplication({ _id: id }, await historyActor(auth.id));
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAdminAction({ actor: auth, action: "application.delete", targetType: "application", targetId: id });
  return NextResponse.json({ success: true, deletedAt: deleted.deletedAt });
}
