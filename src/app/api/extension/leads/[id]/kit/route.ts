export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withCors } from "@/lib/extensionCors";
import { getExtensionHuntUser } from "@/lib/extensionAuth";
import { buildApplyKit } from "@/lib/jobs/kit";
import { parseObjectId } from "@/lib/objectId";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";

type Ctx = { params: Promise<{ id: string }> };

export async function OPTIONS(req: Request) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(req, await handle(req, id));
}

async function handle(req: Request, id: string) {
  const user = await getExtensionHuntUser(req);
  if ("error" in user) return NextResponse.json({ error: user.error }, { status: user.status });
  if (!parseObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gate = await checkRateLimitDb({ key: `ext-kit:user:${user.id}`, limit: 60, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const kit = await buildApplyKit(user, id);
  if ("error" in kit) return NextResponse.json({ error: kit.error }, { status: kit.status });
  return NextResponse.json(kit, { headers: { "Cache-Control": "no-store" } });
}
