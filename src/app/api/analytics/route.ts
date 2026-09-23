export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireActiveAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";

export async function GET() {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  const [totalApplications, interviewsScheduled, offersReceived, rejections] =
    await Promise.all([
      Application.countDocuments({ userId }),
      Application.countDocuments({
        userId,
        applicationStatus: "Interview Scheduled",
      }),
      Application.countDocuments({
        userId,
        applicationStatus: "Offer Received",
      }),
      Application.countDocuments({ userId, applicationStatus: "Rejected" }),
    ]);

  return NextResponse.json({
    totalApplications,
    interviewsScheduled,
    offersReceived,
    rejections,
  });
}
