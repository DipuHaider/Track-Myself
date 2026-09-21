export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { encryptSecret, last4, secretBoxReady } from "@/lib/crypto/secretBox";
import { AI_PROVIDERS, monthKey, validateKey, type StoredKey, type StoredUsage } from "@/lib/ai/userKey";
import { PROVIDER_DEFAULT_MODEL, anyProviderConfigured, type AIProvider } from "@/lib/cv/ai/provider";

function shape(key?: StoredKey, usage?: StoredUsage) {
  const sameMonth = usage?.monthKey === monthKey();

  return {
    configured: Boolean(key?.provider && key?.ciphertext),
    provider: key?.provider ?? null,
    model: key?.model ?? "",
    baseUrl: key?.baseUrl ?? "",
    last4: key?.last4 ?? "",
    status: key?.status ?? "ok",
    lastError: key?.lastError ?? "",
    addedAt: key?.addedAt ?? null,
    lastCheckedAt: key?.lastCheckedAt ?? null,
    usage: {
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      calls: usage?.calls ?? 0,
      lastCallAt: usage?.lastCallAt ?? null,
      monthInputTokens: sameMonth ? usage?.monthInputTokens ?? 0 : 0,
      monthOutputTokens: sameMonth ? usage?.monthOutputTokens ?? 0 : 0,
      monthCalls: sameMonth ? usage?.monthCalls ?? 0 : 0,
    },
    sharedKeyAvailable: anyProviderConfigured(),
    storageReady: secretBoxReady(),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const row = (await User.findById(auth.id, "aiKey aiUsage").lean()) as
    | { aiKey?: StoredKey; aiUsage?: StoredUsage }
    | null;

  return NextResponse.json(shape(row?.aiKey, row?.aiUsage));
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (!secretBoxReady()) {
    return NextResponse.json(
      { error: "Key storage is not configured on this deployment (AI_KEY_SECRET is missing)." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const provider = AI_PROVIDERS.includes(body?.provider) ? (body.provider as AIProvider) : null;
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

  if (!provider) return NextResponse.json({ error: "Pick a provider." }, { status: 400 });
  if (apiKey.length < 12) return NextResponse.json({ error: "That does not look like an API key." }, { status: 400 });

  const model = typeof body?.model === "string" && body.model.trim()
    ? body.model.trim().slice(0, 120)
    : PROVIDER_DEFAULT_MODEL[provider];

  const baseUrl = provider === "openai-compatible" && typeof body?.baseUrl === "string"
    ? body.baseUrl.trim().slice(0, 300)
    : "";

  /* Probe before storing, so a bad key is rejected here rather than failing later
     inside a CV generation the user has already waited on. */
  const probe = await validateKey({ provider, apiKey, model, baseUrl: baseUrl || undefined, source: "user" });
  if (!probe.ok) {
    return NextResponse.json({ error: probe.error, kind: probe.kind }, { status: 400 });
  }

  await dbConnect();
  const sealed = encryptSecret(apiKey);

  await User.updateOne(
    { _id: auth.id },
    {
      $set: {
        "aiKey.provider": provider,
        "aiKey.model": model,
        "aiKey.baseUrl": baseUrl,
        "aiKey.ciphertext": sealed.ciphertext,
        "aiKey.iv": sealed.iv,
        "aiKey.tag": sealed.tag,
        "aiKey.last4": last4(apiKey),
        "aiKey.addedAt": new Date(),
        "aiKey.status": "ok",
        "aiKey.lastError": "",
        "aiKey.lastCheckedAt": new Date(),
      },
    },
  );

  const row = (await User.findById(auth.id, "aiKey aiUsage").lean()) as
    | { aiKey?: StoredKey; aiUsage?: StoredUsage }
    | null;

  return NextResponse.json(shape(row?.aiKey, row?.aiUsage), { status: 201 });
}

export async function DELETE() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  await User.updateOne(
    { _id: auth.id },
    {
      $set: {
        "aiKey.provider": null,
        "aiKey.model": "",
        "aiKey.baseUrl": "",
        "aiKey.ciphertext": "",
        "aiKey.iv": "",
        "aiKey.tag": "",
        "aiKey.last4": "",
        "aiKey.addedAt": null,
        "aiKey.status": "ok",
        "aiKey.lastError": "",
      },
    },
  );

  return NextResponse.json({ ok: true });
}
