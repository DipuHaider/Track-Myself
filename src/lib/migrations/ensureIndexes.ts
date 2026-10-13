import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import Document from "@/models/Document";
import User from "@/models/User";
import Notification from "@/models/Notification";
import CVFile from "@/models/CVFile";
import Todo from "@/models/Todo";
import IssueReport from "@/models/IssueReport";
import JobSearch from "@/models/JobSearch";
import JobLead from "@/models/JobLead";
import ApiToken from "@/models/ApiToken";

const MODELS = { Application, Interview, Document, User, Notification, CVFile, Todo, IssueReport, JobSearch, JobLead, ApiToken };

export async function ensureIndexes(): Promise<Record<string, string[]>> {
  await dbConnect();
  const out: Record<string, string[]> = {};
  for (const [name, model] of Object.entries(MODELS)) {
    await model.syncIndexes();
    const indexes = (await model.collection.indexes()) as { name?: string }[];
    out[name] = indexes.map((i) => i.name ?? "?");
  }
  return out;
}
