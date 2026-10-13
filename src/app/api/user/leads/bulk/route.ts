export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { applyLeadAction } from "@/lib/jobs/leads";
import { isObjectIdString } from "@/lib/objectId";
import { badRequest } from "@/lib/api/respond";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(50),
  action: z.enum(["shortlist", "dismiss", "restore"]),
});

export async function POST(req: Request) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");

  const ids = [...new Set(parsed.data.ids.filter(isObjectIdString))];
  let changed = 0;
  const errors: string[] = [];
  for (const id of ids) {
    const res = await applyLeadAction(auth.id, id, parsed.data.action);
    if (res.ok) changed++;
    else errors.push(`${id}: ${res.error}`);
  }
  return NextResponse.json({ changed, errors });
}
