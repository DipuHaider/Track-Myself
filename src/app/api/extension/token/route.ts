export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireActiveAuth } from "@/lib/serverAuth";
import { mintExtensionToken } from "@/lib/extensionToken";

export async function POST() {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const user = await User.findById(auth.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const minted = await mintExtensionToken(user);
  if (!minted) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  return NextResponse.json(minted, { headers: { "Cache-Control": "no-store" } });
}
