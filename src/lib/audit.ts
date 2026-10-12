import dbConnect from "@/lib/db";
import AdminAction from "@/models/AdminAction";
import { clientIp } from "@/lib/rateLimit";
import { parseObjectId } from "@/lib/objectId";

export const ADMIN_ACTIONS = [
  "user.update", "user.delete",
  "ai.config", "settings.update",
  "rbac.update", "rbac.reset",
  "application.update", "application.delete", "application.restore", "application.purge",
  "issue.update", "issue.delete", "issue.resend",
  "migration.run", "maintenance.run",
] as const;

export type AdminActionType = (typeof ADMIN_ACTIONS)[number];

export type AuditInput = {
  actor: { id?: string | null; email?: string | null } | null;
  action: AdminActionType;
  targetType?: string;
  targetId?: unknown;
  targetLabel?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  req?: Request;
};

const MAX_VALUE = 500;

function compact(obj?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (/password|ciphertext|iv$|tag$|secret|token/i.test(k)) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    out[k] = typeof s === "string" && s.length > MAX_VALUE ? `${s.slice(0, MAX_VALUE)}…` : v;
  }
  return out;
}

/* Never throws and never blocks the response for long: an audit failure is
   logged, not surfaced, because losing one trail entry is better than failing
   the change it describes. */
export async function recordAdminAction(input: AuditInput): Promise<void> {
  try {
    await dbConnect();
    await AdminAction.create({
      actorId: input.actor?.id ? parseObjectId(input.actor.id) : null,
      actorEmail: input.actor?.email ?? "",
      action: input.action,
      targetType: input.targetType ?? "",
      targetId: input.targetId == null ? "" : String(input.targetId),
      targetLabel: (input.targetLabel ?? "").slice(0, 200),
      before: compact(input.before),
      after: compact(input.after),
      ip: input.req ? clientIp(input.req) : "",
    });
  } catch (err) {
    console.error("[audit]", input.action, err instanceof Error ? err.message : err);
  }
}
