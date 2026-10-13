export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withCors } from "@/lib/extensionCors";
import { getExtensionHuntUser } from "@/lib/extensionAuth";
import { applyLeadAction } from "@/lib/jobs/leads";
import { parseObjectId } from "@/lib/objectId";

type Ctx = { params: Promise<{ id: string }> };

export async function OPTIONS(req: Request) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

/* Called when the extension sees the site's own confirmation after the owner
   pressed Submit. It only records what already happened. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(req, await handle(req, id));
}

async function handle(req: Request, id: string) {
  const user = await getExtensionHuntUser(req);
  if ("error" in user) return NextResponse.json({ error: user.error }, { status: user.status });
  if (!parseObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { submissionMethod?: unknown };
  const res = await applyLeadAction(user.id, id, "submitted", {
    submissionMethod: typeof body.submissionMethod === "string" ? body.submissionMethod : undefined,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true, applicationId: res.lead.applicationId });
}
