import { createHmac, randomBytes } from "node:crypto";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { decryptSecret, encryptSecret, last4, secretBoxReady } from "@/lib/crypto/secretBox";
import { assertSafeBaseUrl } from "@/lib/net/safeUrl";
import { normaliseJobHunt, type WebhookEvent } from "@/lib/jobs/settings";

const TIMEOUT_MS = 8_000;

export function signBody(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

export function newWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export async function rotateWebhookSecret(userId: string): Promise<string | null> {
  if (!secretBoxReady()) return null;
  await dbConnect();
  const row = (await User.findById(userId, "jobHunt").lean()) as { jobHunt?: unknown } | null;
  const settings = normaliseJobHunt(row?.jobHunt);
  const secret = newWebhookSecret();
  settings.webhook.sealed = encryptSecret(secret);
  settings.webhook.last4 = last4(secret);
  await User.updateOne({ _id: userId }, { $set: { jobHunt: settings } });
  return secret;
}

export type DeliveryResult = { delivered: boolean; status: string };

async function post(url: string, secret: string, event: string, body: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "TrackMyself-Webhook/1",
      "X-TM-Event": event,
      "X-TM-Signature": signBody(secret, body),
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "manual",
    cache: "no-store",
  });
}

/* Best effort: one retry, never throws, and the outcome is stored so the
   settings page can show whether the last delivery worked. The URL is checked
   again at send time because DNS can change after it was saved. */
export async function sendWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
  opts: { force?: boolean } = {},
): Promise<DeliveryResult> {
  try {
    await dbConnect();
    const row = (await User.findById(userId, "jobHunt").lean()) as { jobHunt?: unknown } | null;
    const settings = normaliseJobHunt(row?.jobHunt);
    const hook = settings.webhook;
    if (!hook.url || !hook.sealed) return { delivered: false, status: "not configured" };
    if (!opts.force && !hook.events.includes(event)) return { delivered: false, status: "event not subscribed" };

    const safe = await assertSafeBaseUrl(hook.url, { label: "Webhook URL", useAllowlist: false });
    if (!safe.ok) return record(userId, { delivered: false, status: safe.error });

    const secret = decryptSecret(hook.sealed);
    const body = JSON.stringify({ event, at: new Date().toISOString(), data });

    let status = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await post(safe.url, secret, event, body);
        status = `HTTP ${res.status}`;
        if (res.ok) return record(userId, { delivered: true, status });
        if (res.status < 500 && res.status !== 429) break;
      } catch (err) {
        status = err instanceof Error ? err.message.slice(0, 100) : "failed";
      }
    }
    return record(userId, { delivered: false, status });
  } catch {
    return { delivered: false, status: "failed" };
  }
}

async function record(userId: string, result: DeliveryResult): Promise<DeliveryResult> {
  await User.updateOne(
    { _id: userId },
    { $set: { "jobHunt.webhook.lastStatus": result.status.slice(0, 120), "jobHunt.webhook.lastAt": new Date().toISOString() } },
  ).catch(() => undefined);
  return result;
}
