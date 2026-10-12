import mongoose from "mongoose";
import dbConnect from "@/lib/db";

/* The Reminder model was removed: nothing ever read it, and follow-up dates on
   applications cover the case. Dropping the collection is the whole migration. */
export async function dropReminders(): Promise<{ dropped: boolean }> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return { dropped: false };
  const existing = await db.listCollections({ name: "reminders" }).toArray();
  if (!existing.length) return { dropped: false };
  await db.dropCollection("reminders");
  return { dropped: true };
}
