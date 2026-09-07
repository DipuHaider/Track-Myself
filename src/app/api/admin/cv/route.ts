export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import { requireAction } from "@/lib/serverAuth";
import { importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import type { CVContent } from "@/types/cv";

type UserRow = { _id: unknown; name: string; email: string; role: string; plan: string };

type ProfileRow = Record<string, unknown> & {
  userId: string;
  content?: unknown;
  primary?: Record<string, string>;
  mainFileId?: string;
  updatedAt?: Date;
};

type FileAgg = { _id: { userId: string; category: string }; files: number; bytes: number };

const CHECKS: { key: string; test: (c: CVContent) => boolean }[] = [
  { key: "name",       test: (c) => Boolean(c.name.trim()) },
  { key: "contact",    test: (c) => Boolean(c.contact.email.trim() || c.contact.phone.trim()) },
  { key: "summary",    test: (c) => Boolean(c.summary.trim()) },
  { key: "experience", test: (c) => c.experience.length > 0 },
  { key: "education",  test: (c) => c.education.length > 0 },
  { key: "skills",     test: (c) => c.skills.length > 0 },
];

function resolveContent(profile: ProfileRow | undefined): { content: CVContent; source: "structured" | "legacy" | "none" } {
  if (!profile) return { content: normaliseContent({}), source: "none" };

  const structured = normaliseContent(profile.content);
  if (!isContentEmpty(structured)) return { content: structured, source: "structured" };

  const legacy = importFromLegacy(profile as never);
  if (!isContentEmpty(legacy)) return { content: legacy, source: "legacy" };

  return { content: structured, source: "none" };
}

export async function GET() {
  const auth = await requireAction("view:cv");
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const [users, profiles, fileAgg] = await Promise.all([
    User.find({}, "name email role plan").sort({ createdAt: -1 }).lean() as unknown as Promise<UserRow[]>,
    CVProfile.find({}, { uploadedFiles: 0 }).lean() as unknown as Promise<ProfileRow[]>,
    CVFile.aggregate<FileAgg>([
      {
        $group: {
          _id: { userId: "$userId", category: "$category" },
          files: { $sum: 1 },
          bytes: { $sum: "$size" },
        },
      },
    ]),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  const filesByUser = new Map<string, { files: number; bytes: number; byCategory: Record<string, number> }>();
  for (const row of fileAgg) {
    const entry = filesByUser.get(row._id.userId) ?? { files: 0, bytes: 0, byCategory: {} };
    entry.files += row.files;
    entry.bytes += row.bytes;
    entry.byCategory[row._id.category ?? "other"] =
      (entry.byCategory[row._id.category ?? "other"] ?? 0) + row.files;
    filesByUser.set(row._id.userId, entry);
  }

  const rows = users.map((u) => {
    const id = String(u._id);
    const profile = profileByUser.get(id);
    const files = filesByUser.get(id);
    const { content, source } = resolveContent(profile);
    const filled = CHECKS.filter((check) => check.test(content)).length;

    return {
      _id: id,
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan,
      hasProfile: source !== "none",
      contentSource: source,
      completeness: Math.round((filled / CHECKS.length) * 100),
      roles: content.experience.length,
      fileCount: files?.files ?? 0,
      storageBytes: files?.bytes ?? 0,
      byCategory: files?.byCategory ?? {},
      hasMainCV: Boolean(profile?.primary?.cv || profile?.mainFileId),
      hasPhoto: Boolean(profile?.primary?.profilePhoto),
      updatedAt: profile?.updatedAt ?? null,
    };
  });

  const categoryTotals: Record<string, number> = {};
  for (const entry of filesByUser.values()) {
    for (const [category, count] of Object.entries(entry.byCategory)) {
      categoryTotals[category] = (categoryTotals[category] ?? 0) + count;
    }
  }

  const totals = {
    users: rows.length,
    withProfile: rows.filter((r) => r.hasProfile).length,
    withFiles: rows.filter((r) => r.fileCount > 0).length,
    withMainCV: rows.filter((r) => r.hasMainCV).length,
    stillLegacy: rows.filter((r) => r.contentSource === "legacy").length,
    files: rows.reduce((sum, r) => sum + r.fileCount, 0),
    storageBytes: rows.reduce((sum, r) => sum + r.storageBytes, 0),
    byCategory: categoryTotals,
  };

  return NextResponse.json({ totals, rows });
}
