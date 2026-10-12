export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireActiveSuperAdminAuth } from "@/lib/serverAuth";
import { MIGRATIONS, migrationNames } from "@/lib/migrations";
import { notFound } from "@/lib/api/respond";
import { recordAdminAction } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const auth = await requireActiveSuperAdminAuth();
  if (auth instanceof NextResponse) return auth;

  const { name } = await params;
  const migration = MIGRATIONS[name];
  if (!migration) return notFound(`Unknown migration. Known: ${migrationNames().join(", ")}`);

  const started = Date.now();
  try {
    const result = await migration.run();
    await recordAdminAction({ actor: auth, action: "migration.run", targetType: "system", targetId: name, after: result as Record<string, unknown>, req: _req });
    return NextResponse.json({ ok: true, name, ms: Date.now() - started, result });
  } catch (err) {
    console.error("[migration]", name, err);
    return NextResponse.json(
      { ok: false, name, error: err instanceof Error ? err.message : "Migration failed" },
      { status: 500 },
    );
  }
}
