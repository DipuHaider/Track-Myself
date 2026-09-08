export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import User from "@/models/User";
import { requireAction } from "@/lib/serverAuth";

type UserRow = { _id: unknown; name: string; email: string; role: string; plan: string };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const auth = await requireAction("view:applications");
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const userId = searchParams.get("userId")?.trim();

  const filter: Record<string, unknown> = {};
  if (userId) filter.userId = userId;
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [
      { companyName: rx },
      { jobTitle: rx },
      { location: rx },
      { country: rx },
      { notes: rx },
    ];
  }

  const applications = await Application.find(filter).sort({ createdAt: -1 }).lean();

  const ownerIds = [...new Set(applications.map((a) => String(a.userId)))];
  const owners = (await User.find(
    { _id: { $in: ownerIds } },
    "name email role plan",
  ).lean()) as unknown as UserRow[];

  const ownerById = new Map(owners.map((u) => [String(u._id), u]));

  return NextResponse.json(
    applications.map((app) => {
      const owner = ownerById.get(String(app.userId));
      return {
        ...app,
        _id: String(app._id),
        userId: String(app.userId),
        owner: owner
          ? { _id: String(owner._id), name: owner.name, email: owner.email, role: owner.role, plan: owner.plan }
          : null,
      };
    }),
  );
}
