import dbConnect from "@/lib/db";
import JobLead from "@/models/JobLead";
import { sendWebhook } from "@/lib/jobs/webhooks";

const PREVIEW = 10;

/* Webhook payloads carry identifiers and headlines only, never descriptions,
   CV text or letters; a receiver that needs more calls the API with a token. */
export async function emitLeadsCreated(userId: string, ids: string[], via: string): Promise<void> {
  if (!ids.length) return;
  await dbConnect();
  const rows = (await JobLead.find({ _id: { $in: ids.slice(0, PREVIEW) }, userId }, "company title platform fitScore url deadline").lean()) as
    { _id: { toString(): string }; company: string; title: string; platform?: string; fitScore?: number | null; url?: string; deadline?: Date | null }[];
  await sendWebhook(userId, "lead.created", {
    via,
    count: ids.length,
    leads: rows.map((r) => ({
      id: r._id.toString(), company: r.company, title: r.title, platform: r.platform ?? "Other",
      fitScore: r.fitScore ?? null, url: r.url ?? "", deadline: r.deadline ? r.deadline.toISOString() : null,
    })),
  });
}

export async function emitLeadReady(userId: string, lead: { id: string; company: string; title: string; applicationId: string }): Promise<void> {
  await sendWebhook(userId, "lead.ready", lead);
}

export async function emitSubmitted(userId: string, data: { leadId: string; applicationId: string | null; company: string; title: string; method: string }): Promise<void> {
  await sendWebhook(userId, "application.submitted", data);
}
