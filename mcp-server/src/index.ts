#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { configFromEnv, createClient, TrackMyselfError, type TrackMyselfClient } from "./client.js";

const STATUSES = ["open", "new", "shortlisted", "preparing", "ready", "applying", "submitted", "dismissed", "expired", "failed"] as const;
const PLATFORMS = ["linkedin", "xing", "stepstone", "other"] as const;
const APPLICATION_STATUSES = [
  "Wishlist", "Not Completed", "Submitted", "No Response", "Interview Scheduled",
  "Active - Written", "Active - HR", "Active - Technical", "Active - Cultural Fit",
  "Offer Received", "Rejected", "Withdrawn",
] as const;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    const data = await fn();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    const msg = err instanceof TrackMyselfError ? `TrackMyself ${err.status}: ${err.message}` : err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}

export function buildServer(api: TrackMyselfClient): McpServer {
  const server = new McpServer({ name: "trackmyself", version: "0.1.0" });

  server.registerTool("list_leads", {
    title: "List job leads",
    description:
      "List jobs in the TrackMyself job inbox. Default: open leads sorted by fit. Fit is word overlap between the CV and posting (0-100), not a judgement of ability.",
    inputSchema: {
      status: z.enum(STATUSES).optional().describe("Which leads; 'open' is everything not yet done or dismissed."),
      platform: z.enum(PLATFORMS).optional().describe("Where the application would be submitted."),
      q: z.string().max(100).optional().describe("Search company, title or place."),
      sort: z.enum(["fit", "new", "deadline"]).optional(),
      minFit: z.number().int().min(0).max(100).optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    annotations: { readOnlyHint: true },
  }, (args) => run(() => api.listLeads(args)));

  server.registerTool("get_lead", {
    title: "Get one job lead",
    description: "Full detail of one lead, including the job description, gap questions and prepared-document notes.",
    inputSchema: { id: z.string().regex(/^[a-f0-9]{24}$/i) },
    annotations: { readOnlyHint: true },
  }, ({ id }) => run(() => api.getLead(id)));

  server.registerTool("shortlist_leads", {
    title: "Shortlist leads",
    description: "Mark leads as worth pursuing. Does not prepare or submit anything.",
    inputSchema: { ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(25) },
  }, ({ ids }) => run(async () => Promise.all(ids.map((id) => api.leadAction(id, "shortlist").then(() => ({ id, ok: true }), (e: Error) => ({ id, ok: false, error: e.message }))))));

  server.registerTool("dismiss_leads", {
    title: "Dismiss leads",
    description: "Remove leads from the inbox. They can be restored for 30 days.",
    inputSchema: { ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(25) },
    annotations: { destructiveHint: false },
  }, ({ ids }) => run(async () => Promise.all(ids.map((id) => api.leadAction(id, "dismiss").then(() => ({ id, ok: true }), (e: Error) => ({ id, ok: false, error: e.message }))))));

  server.registerTool("answer_gap_questions", {
    title: "Answer gap questions",
    description:
      "Record the user's own answers to a lead's gap questions (e.g. real Kubernetes experience). Only pass what the user actually said; these feed the next CV tailoring.",
    inputSchema: {
      id: z.string().regex(/^[a-f0-9]{24}$/i),
      answers: z.array(z.object({ requirement: z.string().max(300), answer: z.string().max(1000) })).min(1).max(20),
    },
  }, ({ id, answers }) => run(() => api.answerGaps(id, answers)));

  server.registerTool("prepare_lead", {
    title: "Prepare an application",
    description:
      "Create the tracked application, a tailored CV, a cover letter and a gap check for one lead. Uses the user's AI allowance or own key and takes up to a minute. The user still reviews and submits in TrackMyself.",
    inputSchema: { id: z.string().regex(/^[a-f0-9]{24}$/i) },
    annotations: { openWorldHint: true },
  }, ({ id }) => run(() => api.prepareLead(id)));

  server.registerTool("add_leads", {
    title: "Add jobs to the inbox",
    description:
      "Add jobs found elsewhere (a link the user pasted, a job-alert email). Deduplicated against the inbox and tracked applications.",
    inputSchema: {
      source: z.enum(["manual", "email-alert", "linkedin", "xing", "stepstone", "indeed"]).default("manual"),
      leads: z.array(z.object({
        title: z.string().min(1).max(300),
        company: z.string().min(1).max(200),
        url: z.string().url(),
        location: z.string().max(200).optional(),
        description: z.string().max(24000).optional(),
        postedAt: z.string().optional().describe("ISO date"),
        deadline: z.string().optional().describe("ISO date"),
        salary: z.string().max(200).optional(),
      })).min(1).max(50),
    },
  }, ({ source, leads }) => run(() => api.addLeads(source, leads)));

  server.registerTool("run_hunt", {
    title: "Run the job search now",
    description: "Run every active saved search immediately (limited to four times an hour).",
    inputSchema: {},
    annotations: { openWorldHint: true },
  }, () => run(() => api.runHunt()));

  server.registerTool("daily_report", {
    title: "Daily report",
    description: "Today's (or a given day's) job-hunt report: new leads vs targets, what is waiting for review, deadlines, follow-ups and feedback.",
    inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() },
    annotations: { readOnlyHint: true },
  }, ({ date }) => run(() => api.report(date)));

  server.registerTool("insights", {
    title: "Application insights",
    description: "One row per application over the last N days with platform, fit, response and interview outcomes, for analysing what works.",
    inputSchema: { days: z.number().int().min(7).max(365).optional() },
    annotations: { readOnlyHint: true },
  }, ({ days }) => run(() => api.insights(days)));

  server.registerTool("list_applications", {
    title: "List tracked applications",
    description: "Applications in the tracker, newest activity first.",
    inputSchema: {
      status: z.enum(APPLICATION_STATUSES).optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
    annotations: { readOnlyHint: true },
  }, (args) => run(() => api.listApplications(args)));

  server.registerTool("update_application_status", {
    title: "Update an application",
    description:
      "Change an application's status, notes, follow-up date or priority, e.g. after the user says they got an interview invite. Status history is recorded.",
    inputSchema: {
      id: z.string().regex(/^[a-f0-9]{24}$/i),
      applicationStatus: z.enum(APPLICATION_STATUSES).optional(),
      notes: z.string().max(10000).optional(),
      followUpDate: z.string().optional().describe("ISO date, or omit"),
      priority: z.enum(["Low", "Medium", "High"]).optional(),
    },
  }, ({ id, ...patch }) => run(() => api.updateApplication(id, patch)));

  return server;
}

async function main() {
  const api = createClient(configFromEnv());
  const server = buildServer(api);
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
