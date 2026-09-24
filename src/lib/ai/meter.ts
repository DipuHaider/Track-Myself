import dbConnect from "@/lib/db";
import User from "@/models/User";
import { monthKey } from "@/lib/ai/userKey";
import type { FailureKind, TokenUsage } from "@/lib/cv/ai/provider";

export type Funding = "user" | "shared" | "superadmin";

function statusFor(kind?: FailureKind) {
  if (kind === "invalid") return "invalid";
  if (kind === "rate-limited") return "rate-limited";
  if (kind === "quota") return "quota";
  return "error";
}

/* The only place provider usage is written, and it is awaited by the gateway
   rather than fired and forgotten — a serverless function is frozen once its
   response is sent, so an unawaited write in a route handler simply never
   happens. That, as much as the source guard, is why shared-key usage has never
   been recorded.

   Funding decides which field is written, and the separation matters. Shared
   usage must not land in aiUsage: that field means "your key's usage" in the
   AI-key page, and a shared-key 401 writing aiKey.status would tell users their
   own key is broken when it is not theirs that failed. */
export async function recordCall(input: {
  userId: string | null;
  source: Funding;
  usage?: TokenUsage;
  outcome: { ok: boolean; kind?: FailureKind; error?: string };
}): Promise<void> {
  if (!input.userId) return;

  try {
    await dbConnect();

    const now = new Date();
    const key = monthKey(now);
    const field = input.source === "user" ? "aiUsage" : "aiSharedUsage";
    const inTok = input.usage?.inputTokens ?? 0;
    const outTok = input.usage?.outputTokens ?? 0;

    /* Roll the month only when it is stale, as a conditional update. Two calls
       racing across midnight cannot both take a reset branch and lose one
       another's tokens, which the previous read-then-write could. */
    await User.updateOne(
      { _id: input.userId, [`${field}.monthKey`]: { $ne: key } },
      {
        $set: {
          [`${field}.monthKey`]: key,
          [`${field}.monthInputTokens`]: 0,
          [`${field}.monthOutputTokens`]: 0,
          [`${field}.monthCalls`]: 0,
        },
      },
    );

    const set: Record<string, unknown> = { [`${field}.lastCallAt`]: now };

    if (input.source === "user") {
      set["aiKey.lastCheckedAt"] = now;
      set["aiKey.status"] = input.outcome.ok ? "ok" : statusFor(input.outcome.kind);
      set["aiKey.lastError"] = input.outcome.ok ? "" : (input.outcome.error ?? "").slice(0, 300);
    }

    await User.updateOne(
      { _id: input.userId },
      {
        $inc: {
          [`${field}.inputTokens`]: inTok,
          [`${field}.outputTokens`]: outTok,
          [`${field}.calls`]: 1,
          [`${field}.monthInputTokens`]: inTok,
          [`${field}.monthOutputTokens`]: outTok,
          [`${field}.monthCalls`]: 1,
        },
        $set: set,
      },
    );
  } catch {
    /* Metering must never break the feature it is measuring. */
  }
}
