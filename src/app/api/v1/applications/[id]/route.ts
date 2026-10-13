export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateToken } from "@/lib/apiTokens";
import { historyActor, updateApplication } from "@/lib/applicationHistory";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";
import { parseObjectId } from "@/lib/objectId";
import { badRequest, notFound } from "@/lib/api/respond";

type Ctx = { params: Promise<{ id: string }> };

const schema = z
  .object({
    applicationStatus: z.enum(APPLICATION_STATUSES).optional(),
    notes: z.string().max(10_000).optional(),
    followUpDate: z.string().max(40).nullable().optional(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticateToken(req, "applications:write");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid update");

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.followUpDate !== undefined) {
    const d = parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null;
    if (d && Number.isNaN(d.getTime())) return badRequest("followUpDate is not a date");
    update.followUpDate = d;
  }

  const app = (await updateApplication({ _id: id, userId: auth.id }, update, () => historyActor(auth.id))) as
    | { applicationStatus?: string }
    | null;
  if (!app) return notFound();
  return NextResponse.json({ ok: true, id, applicationStatus: app.applicationStatus });
}
