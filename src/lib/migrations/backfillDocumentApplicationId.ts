import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Document from "@/models/Document";
import { attachmentIdFromUrl } from "@/lib/attachments";

export async function backfillDocumentApplicationId(): Promise<{ linked: number; scanned: number }> {
  await dbConnect();
  const apps = (await Application.find({ "attachments.0": { $exists: true } }, "userId attachments")
    .setOptions({ withDeleted: true })
    .lean()) as { _id: unknown; userId: unknown; attachments?: string[] }[];

  let linked = 0;
  for (const app of apps) {
    const ids = (app.attachments ?? []).map(attachmentIdFromUrl).filter((id): id is string => Boolean(id));
    if (!ids.length) continue;
    const res = await Document.updateMany(
      { _id: { $in: ids }, userId: app.userId, applicationId: null },
      { $set: { applicationId: app._id } },
    );
    linked += res.modifiedCount ?? 0;
  }
  return { linked, scanned: apps.length };
}
