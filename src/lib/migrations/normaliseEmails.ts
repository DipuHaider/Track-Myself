import dbConnect from "@/lib/db";
import User from "@/models/User";
import { normaliseEmail } from "@/lib/emailAddress";

export async function normaliseEmails(): Promise<{ updated: number; conflicts: string[] }> {
  await dbConnect();
  const rows = (await User.find(
    { $expr: { $ne: ["$email", { $toLower: { $trim: { input: "$email" } } }] } },
    "email",
  ).lean()) as { _id: unknown; email: string }[];

  let updated = 0;
  const conflicts: string[] = [];
  for (const row of rows) {
    const lower = normaliseEmail(row.email);
    const clash = await User.exists({ email: lower, _id: { $ne: row._id } });
    if (clash) {
      conflicts.push(`${row.email} <-> ${lower}`);
      continue;
    }
    await User.updateOne({ _id: row._id }, { $set: { email: lower } });
    updated++;
  }
  return { updated, conflicts };
}
