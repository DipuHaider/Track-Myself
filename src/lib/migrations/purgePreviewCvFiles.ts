import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";

/* Preview drafts used to be stored as byte-less CVFile rows, which then
   appeared in "Generated documents" and never expired. Drafts now live in
   AiDraft with a TTL, so the old rows are simply removed. */
export async function purgePreviewCvFiles(): Promise<{ removed: number }> {
  await dbConnect();
  const res = await CVFile.deleteMany({ generated: true, genOutput: "preview" });
  return { removed: res.deletedCount ?? 0 };
}
