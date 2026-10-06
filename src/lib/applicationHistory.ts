import Application from "@/models/Application";
import User from "@/models/User";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";

const HISTORY_MAX = 100;

export type StatusKind = "created" | "transition" | "observed_baseline";

export type HistoryActor = { id: string; name: string };

export type StatusEvent = { status: string; at: Date; kind: StatusKind; byId?: string; byName?: string };

function isStatus(value: unknown): value is string {
  return typeof value === "string" && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

function stamp(actor?: HistoryActor | null) {
  return actor ? { byId: actor.id, byName: actor.name } : {};
}

export async function historyActor(userId: string): Promise<HistoryActor> {
  const row = (await User.findById(userId, "name").lean()) as { name?: string } | null;
  return { id: userId, name: row?.name || "" };
}

export function initialHistory(status: unknown, actor?: HistoryActor | null): StatusEvent[] {
  if (!isStatus(status)) return [];
  return [{ status, at: new Date(), kind: "created", ...stamp(actor) }];
}

/* Both application update routes take whatever the client sent and spread it, so
   a status change and a notes edit are indistinguishable by the time they reach
   the database. History is only appended when applicationStatus is present in the
   update AND differs from what is stored — otherwise editing a note would record
   a transition that never happened.

   The write is guarded on the status we read, so two concurrent edits cannot both
   append. If the guard misses, the row moved underneath us and we re-read once. */
const PROTECTED_FIELDS = new Set([
  "_id", "userId", "createdAt", "updatedAt", "statusHistory", "interviewSeen",
  "deletedAt", "deletedBy", "deletedByName", "__v",
]);

const WRITE_OPTIONS = { new: true, runValidators: true } as const;

export function sanitizeUpdate(incoming: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (key.startsWith("$") || key.includes(".") || PROTECTED_FIELDS.has(key)) continue;
    update[key] = value;
  }
  return update;
}

export function isValidationError(err: unknown): err is Error & { errors?: Record<string, { message: string }> } {
  return err instanceof Error && (err.name === "ValidationError" || err.name === "CastError");
}

export function validationMessage(err: Error & { errors?: Record<string, { message: string }> }): string {
  const first = err.errors ? Object.values(err.errors)[0]?.message : "";
  return first || "Some fields have invalid values.";
}

type ActorSource = HistoryActor | null | undefined | (() => Promise<HistoryActor>);

async function resolveActor(actor: ActorSource): Promise<HistoryActor | null> {
  if (typeof actor === "function") return actor();
  return actor ?? null;
}

export async function updateApplication(
  filter: Record<string, unknown>,
  incoming: Record<string, unknown>,
  actor?: ActorSource,
) {
  const update = sanitizeUpdate(incoming);
  const next = update.applicationStatus;

  if (!isStatus(next)) {
    return Application.findOneAndUpdate(filter, update, WRITE_OPTIONS);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const before = (await Application.findOne(filter, "applicationStatus").lean()) as
      | { applicationStatus?: string }
      | null;

    if (!before) return null;
    if (before.applicationStatus === next) {
      return Application.findOneAndUpdate(filter, update, WRITE_OPTIONS);
    }

    const event: StatusEvent = {
      status: next, at: new Date(), kind: "transition", ...stamp(await resolveActor(actor)),
    };

    const guarded = await Application.findOneAndUpdate(
      { ...filter, applicationStatus: before.applicationStatus },
      {
        $set: update,
        $push: { statusHistory: { $each: [event], $slice: -HISTORY_MAX } },
      },
      WRITE_OPTIONS,
    );

    if (guarded) return guarded;
  }

  return Application.findOneAndUpdate(filter, update, WRITE_OPTIONS);
}
