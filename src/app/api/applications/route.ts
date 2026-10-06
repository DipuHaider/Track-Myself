export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { historyActor, initialHistory, isValidationError, sanitizeUpdate, validationMessage } from "@/lib/applicationHistory";
import { requireActiveAuth } from "@/lib/serverAuth";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const filter: Record<string, unknown> = { userId };
  if (q) {
    const rx = { $regex: escapeRegex(q.slice(0, 120)), $options: "i" };
    filter.$or = [
      { companyName: rx },
      { jobTitle: rx },
      { notes: rx },
    ];
  }

  const applications = await Application.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(applications);
}

export async function POST(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  const body = await req.json();

  if (!body.force) {
    const existing = await Application.findOne({
      userId,
      companyName: { $regex: `^${escapeRegex(body.companyName ?? "")}$`, $options: "i" },
      jobTitle:    { $regex: `^${escapeRegex(body.jobTitle ?? "")}$`,    $options: "i" },
    }).select("_id companyName jobTitle appliedDate applicationStatus").lean();

    if (existing) {
      return NextResponse.json({ error: "duplicate", existing }, { status: 409 });
    }
  }

  const data = sanitizeUpdate(body);
  delete data.force;
  try {
    const application = await Application.create({
      ...data,
      userId,
      statusHistory: initialHistory(data.applicationStatus, await historyActor(userId)),
    });
    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    if (isValidationError(err)) return NextResponse.json({ error: validationMessage(err) }, { status: 400 });
    throw err;
  }
}
