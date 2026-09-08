export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { registerSchema } from "@/schemas/authSchema";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const gate = checkRateLimit({
    key: `register:${clientIp(req)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many accounts created from this address. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  try {
    await dbConnect();

    const json = await req.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    return NextResponse.json(
      { id: user._id.toString(), name: user.name, email: user.email },
      { status: 201 },
    );
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
