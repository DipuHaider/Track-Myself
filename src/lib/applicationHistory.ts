import Application from "@/models/Application";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";

const HISTORY_MAX = 100;

export type StatusKind = "created" | "transition" | "observed_baseline";

export type StatusEvent = { status: string; at: Date; kind: StatusKind };

function isStatus(value: unknown): value is string {
  return typeof value === "string" && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function initialHistory(status: unknown): StatusEvent[] {
  if (!isStatus(status)) return [];
  return [{ status, at: new Date(), kind: "created" }];
}

/* Both application update routes take whatever the client sent and spread it, so
   a status change and a notes edit are indistinguishable by the time they reach
   the database. History is only appended when applicationStatus is present in the
   update AND differs from what is stored — otherwise editing a note would record
   a transition that never happened.

   The write is guarded on the status we read, so two concurrent edits cannot both
   append. If the guard misses, the row moved underneath us and we re-read once. */
export async function updateApplication(
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
) {
  const next = update.applicationStatus;

  if (!isStatus(next)) {
    return Application.findOneAndUpdate(filter, update, { new: true });
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const before = (await Application.findOne(filter, "applicationStatus").lean()) as
      | { applicationStatus?: string }
      | null;

    if (!before) return null;
    if (before.applicationStatus === next) {
      return Application.findOneAndUpdate(filter, update, { new: true });
    }

    const event: StatusEvent = { status: next, at: new Date(), kind: "transition" };

    const guarded = await Application.findOneAndUpdate(
      { ...filter, applicationStatus: before.applicationStatus },
      {
        $set: update,
        $push: { statusHistory: { $each: [event], $slice: -HISTORY_MAX } },
      },
      { new: true },
    );

    if (guarded) return guarded;
  }

  return Application.findOneAndUpdate(filter, update, { new: true });
}
