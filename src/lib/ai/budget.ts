import { randomUUID } from "crypto";
import dbConnect from "@/lib/db";
import AiBudget from "@/models/AiBudget";
import AiCallLog from "@/models/AiCallLog";
import AiUsageCounter from "@/models/AiUsageCounter";
import { actualNano, type ModelSpec } from "@/lib/ai/models";

const LOG_RETENTION_DAYS = 400;
const COUNTER_RETENTION_DAYS = 120;

export type LeaseRequest = {
  subject: string;
  userId: string | null;
  task: string;
  spec: ModelSpec;
  estNano: number;
  attemptLimit: number;
  ceilingNano: number;
};

export type Lease = {
  callId: string;
  subject: string;
  periodKey: string;
  estNano: number;
  spec: ModelSpec;
  metered: boolean;
};

export type LeaseDenial =
  | { reason: "user-quota"; used: number; limit: number; periodKey: string }
  | { reason: "budget"; periodKey: string };

export function periodKey(at: Date = new Date()): string {
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
}

function counterId(subject: string, key: string): string {
  return `${subject}|${key}`;
}

function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

function periodEnd(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1));
}

/* Reserve an attempt for this subject in this period.

   The filter carries the guard, so MongoDB evaluates it while holding the
   document lock — concurrent requests cannot collectively exceed the limit. A
   duplicate-key error is the guard working, not a fault: the document already
   exists and its count was at the limit, so the update matched nothing and the
   upsert could not insert either.

   subject and periodKey are deliberately absent from $setOnInsert. They come
   from the filter's equality terms; naming them twice is a path conflict. */
async function reserveAttempt(
  subject: string,
  key: string,
  limit: number,
): Promise<{ ok: true; used: number } | { ok: false }> {
  const expiresAt = new Date(periodEnd(key).getTime() + COUNTER_RETENTION_DAYS * 86400000);

  try {
    const doc = (await AiUsageCounter.findOneAndUpdate(
      { _id: counterId(subject, key), reserved: { $lt: limit } },
      {
        $inc: { reserved: 1 },
        $set: { limit },
        $setOnInsert: { subject, periodKey: key, settled: 0, released: 0, expiresAt },
      },
      { upsert: true, returnDocument: "after" },
    ).lean()) as { reserved?: number } | null;

    if (!doc) return { ok: false };
    return { ok: true, used: doc.reserved ?? 1 };
  } catch (err) {
    if (isDuplicateKey(err)) return { ok: false };
    throw err;
  }
}

async function releaseAttempt(subject: string, key: string): Promise<void> {
  await AiUsageCounter.updateOne(
    { _id: counterId(subject, key) },
    { $inc: { reserved: -1, released: 1 } },
  ).catch(() => {});
}

/* The ceiling is read from the document rather than passed in, so raising it
   takes effect immediately instead of waiting out a config cache. Comparing one
   field against another needs $expr, and MongoDB rejects $expr in the predicate
   of an upsert — so the document is created first in its own idempotent step,
   and the guarded increment then runs without upsert. */
async function ensureBudgetDoc(key: string, ceilingNano: number): Promise<void> {
  try {
    await AiBudget.updateOne(
      { _id: `global:${key}` },
      {
        $setOnInsert: {
          periodKey: key,
          ceilingNano,
          reservedNano: 0,
          settledNano: 0,
          holdCount: 0,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    /* Two callers can race to create the period's first document. Losing that
       race is success: the document now exists, which is all this needed. */
    if (!isDuplicateKey(err)) throw err;
  }
}

async function reserveMoney(key: string, estNano: number, ceilingNano: number): Promise<boolean> {
  await ensureBudgetDoc(key, ceilingNano);

  const doc = await AiBudget.findOneAndUpdate(
    {
      _id: `global:${key}`,
      $expr: { $lte: [{ $add: ["$reservedNano", estNano] }, "$ceilingNano"] },
    },
    { $inc: { reservedNano: estNano, holdCount: 1 } },
    { returnDocument: "after" },
  ).lean();

  return Boolean(doc);
}

/* Two counters, reserved in a fixed order with a compensating release rather
   than a transaction, so this holds on a standalone mongod as well as a replica
   set. The attempt counter goes first: it is uncontended, and denying there
   avoids touching the single hot budget document on the common rejection path. */
export async function openLease(req: LeaseRequest): Promise<
  { ok: true; lease: Lease } | { ok: false; denial: LeaseDenial }
> {
  await dbConnect();

  const key = periodKey();
  const metered = req.spec.funded;
  const callId = randomUUID();

  const attempt = await reserveAttempt(req.subject, key, req.attemptLimit);
  if (!attempt.ok) {
    return {
      ok: false,
      denial: { reason: "user-quota", used: req.attemptLimit, limit: req.attemptLimit, periodKey: key },
    };
  }

  if (metered && req.estNano > 0) {
    const funded = await reserveMoney(key, req.estNano, req.ceilingNano);
    if (!funded) {
      await releaseAttempt(req.subject, key);
      return { ok: false, denial: { reason: "budget", periodKey: key } };
    }
  }

  await AiCallLog.create({
    callId,
    userId: req.userId,
    subject: req.subject,
    task: req.task,
    modelId: req.spec.id,
    funding: metered ? "shared" : req.spec.availability === "byok" ? "user" : "superadmin",
    periodKey: key,
    estNano: metered ? req.estNano : 0,
    state: "reserved",
    expiresAt: new Date(Date.now() + LOG_RETENTION_DAYS * 86400000),
  });

  return {
    ok: true,
    lease: { callId, subject: req.subject, periodKey: key, estNano: metered ? req.estNano : 0, spec: req.spec, metered },
  };
}

export async function markDispatched(lease: Lease): Promise<void> {
  await AiCallLog.updateOne(
    { callId: lease.callId, state: "reserved" },
    { $set: { state: "dispatched", dispatchedAt: new Date() } },
  );
}

/* Every counter change is gated on the state transition landing first. If the
   transition matches nothing, a sweeper already accounted for this call and
   touching the counters again would double-count it. */
export async function closeLease(
  lease: Lease,
  result: {
    dispatched: boolean;
    ok: boolean;
    kind?: string;
    error?: string;
    inputTokens?: number;
    outputTokens?: number;
  },
): Promise<void> {
  const now = new Date();

  if (!result.dispatched) {
    const moved = await AiCallLog.findOneAndUpdate(
      { callId: lease.callId, state: "reserved" },
      { $set: { state: "released", settledAt: now, outcome: { ok: false, kind: result.kind ?? "", error: result.error ?? "" } } },
    );
    if (!moved) return;

    if (lease.metered && lease.estNano > 0) {
      await AiBudget.updateOne(
        { _id: `global:${lease.periodKey}` },
        { $inc: { reservedNano: -lease.estNano, holdCount: -1 } },
      );
    }
    await releaseAttempt(lease.subject, lease.periodKey);
    return;
  }

  const spent = lease.metered
    ? actualNano(lease.spec, result.inputTokens ?? 0, result.outputTokens ?? 0)
    : 0;

  const moved = await AiCallLog.findOneAndUpdate(
    { callId: lease.callId, state: "dispatched" },
    {
      $set: {
        state: "settled",
        settledAt: now,
        actualNano: spent,
        inputTokens: result.inputTokens ?? 0,
        outputTokens: result.outputTokens ?? 0,
        outcome: { ok: result.ok, kind: result.kind ?? "", error: result.error ?? "" },
      },
    },
  );
  if (!moved) return;

  if (lease.metered) {
    await AiBudget.updateOne(
      { _id: `global:${lease.periodKey}` },
      { $inc: { reservedNano: spent - lease.estNano, settledNano: spent, holdCount: -1 } },
    );
  }
  await AiUsageCounter.updateOne(
    { _id: counterId(lease.subject, lease.periodKey) },
    { $inc: { settled: 1 } },
  ).catch(() => {});
}

/* A call still marked dispatched long after the function could have lived was
   very likely billed by the provider even though nothing came back. It is
   settled at the estimate rather than released: over-counting the operator's own
   spend is the safe direction to be wrong. A row still in "reserved" never
   reached a provider, so that one is genuinely released. */
export async function sweepOrphans(orphanMs: number, max = 5): Promise<number> {
  await dbConnect();

  const cutoff = new Date(Date.now() - orphanMs);
  let handled = 0;

  for (let i = 0; i < max; i++) {
    const orphan = await AiCallLog.findOneAndUpdate(
      { state: "dispatched", dispatchedAt: { $lt: cutoff } },
      { $set: { state: "orphaned", settledAt: new Date() } },
      { sort: { dispatchedAt: 1 } },
    );
    if (!orphan) break;

    if (orphan.estNano > 0) {
      await AiBudget.updateOne(
        { _id: `global:${orphan.periodKey}` },
        { $inc: { settledNano: orphan.estNano, holdCount: -1 } },
      );
    }
    await AiUsageCounter.updateOne(
      { _id: counterId(orphan.subject, orphan.periodKey) },
      { $inc: { settled: 1 } },
    ).catch(() => {});
    handled++;
  }

  for (let i = 0; i < max; i++) {
    const stale = await AiCallLog.findOneAndUpdate(
      { state: "reserved", createdAt: { $lt: cutoff } },
      { $set: { state: "released", settledAt: new Date() } },
      { sort: { createdAt: 1 } },
    );
    if (!stale) break;

    if (stale.estNano > 0) {
      await AiBudget.updateOne(
        { _id: `global:${stale.periodKey}` },
        { $inc: { reservedNano: -stale.estNano, holdCount: -1 } },
      );
    }
    await releaseAttempt(stale.subject, stale.periodKey);
    handled++;
  }

  return handled;
}
