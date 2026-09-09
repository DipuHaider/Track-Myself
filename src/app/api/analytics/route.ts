export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
