import dbConnect from "@/lib/db";
import User from "@/models/User";

/* Accounts that existed before email verification shipped have no field at
   all, which isVerified() already treats as verified. Stamping them makes the
   admin view honest and lets the "absent = legacy" rule retire one day. */
export async function backfillEmailVerified(): Promise<{ stamped: number }> {
  await dbConnect();
  const res = await User.updateMany(
    { emailVerifiedAt: { $exists: false } },
    [{ $set: { emailVerifiedAt: { $ifNull: ["$createdAt", "$$NOW"] } } }],
  );
  return { stamped: res.modifiedCount ?? 0 };
}
