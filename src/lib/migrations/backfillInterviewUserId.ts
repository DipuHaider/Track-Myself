import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";

export async function backfillInterviewUserId(): Promise<{ stamped: number; orphansRemoved: number }> {
  await dbConnect();
  const rows = (await Interview.find({ userId: { $in: [null, undefined] } }, "applicationId").lean()) as
    { _id: unknown; applicationId: unknown }[];

  let stamped = 0;
  let orphansRemoved = 0;
  for (const row of rows) {
    const app = (await Application.findById(row.applicationId, "userId").setOptions({ withDeleted: true }).lean()) as
      | { userId?: unknown }
      | null;
    if (!app?.userId) {
      await Interview.deleteOne({ _id: row._id });
      orphansRemoved++;
      continue;
    }
    await Interview.updateOne({ _id: row._id }, { $set: { userId: app.userId } });
    stamped++;
  }
  return { stamped, orphansRemoved };
}
