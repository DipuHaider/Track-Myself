export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireAction } from "@/lib/serverAuth";
import { USER_ADMIN_SELECT, adminUserRow } from "@/lib/serialisers/user";
import { ACCOUNT_STATUSES, PLANS, ROLES } from "@/lib/permissions";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  createdAt: { createdAt: -1 },
  name: { name: 1 },
  lastLoginAt: { lastLoginAt: -1 },
  email: { email: 1 },
};

/* Without ?page the full list still comes back (the dashboard's first paint
   depends on it); with it, an envelope. Both shapes use the allow-listed row. */
export async function GET(req: Request) {
  const auth = await requireAction("view:users");
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 120);
  const role = searchParams.get("role");
  const plan = searchParams.get("plan");
  const status = searchParams.get("status");
  const sortKey = searchParams.get("sort") ?? "createdAt";
  const dir = searchParams.get("dir") === "asc" ? 1 : -1;
  const pageParam = searchParams.get("page");

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (role && (ROLES as readonly string[]).includes(role)) filter.role = role;
  if (plan && (PLANS as readonly string[]).includes(plan)) filter.plan = plan;
  if (status && (ACCOUNT_STATUSES as readonly string[]).includes(status)) filter.status = status;

  const base = SORTS[sortKey] ?? SORTS.createdAt;
  const sort = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, (v * dir * -1) as 1 | -1]));

  if (!pageParam) {
    const users = await User.find(filter, USER_ADMIN_SELECT).sort(sort).limit(500).lean();
    return NextResponse.json(users.map((u) => adminUserRow(u as Record<string, unknown>)));
  }

  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));
  const [items, total] = await Promise.all([
    User.find(filter, USER_ADMIN_SELECT).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return NextResponse.json({
    items: items.map((u) => adminUserRow(u as Record<string, unknown>)),
    total,
    page,
    limit,
  });
}
