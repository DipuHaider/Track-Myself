export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { effectiveRole } from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const token = await encode({
    token: {
      id:    user._id.toString(),
      role:  effectiveRole(user.email, user.role),
      email: user.email,
    },
    secret,
    maxAge: 30 * 24 * 3600,
  });

  return NextResponse.json({ token, name: user.name ?? "", email: user.email });
}
