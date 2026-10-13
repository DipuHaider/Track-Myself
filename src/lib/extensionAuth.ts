import { decode } from "next-auth/jwt";
import { sessionsRevokedBefore } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { jobHuntAllowed } from "@/lib/jobs/access";
import type { Plan, Role } from "@/lib/permissions";

export type ExtensionUser = { id: string; role: string };

/* The extension authenticates with its own JWT (aud "extension"), minted by
   /api/extension/token or /api/extension/auth. A web session token is
   refused here, and "sign out everywhere" revokes extension tokens too. */
export async function getExtensionUser(req: Request): Promise<ExtensionUser | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const payload = await decode({ token: auth.slice(7), secret });
    if (!payload?.id || payload.aud !== "extension") return null;
    const startedAt = payload.sessionStart ?? (payload.iat ? payload.iat * 1000 : 0);
    if (await sessionsRevokedBefore(payload.id as string, startedAt)) return null;
    return { id: payload.id as string, role: (payload.role ?? "free") as string };
  } catch {
    return null;
  }
}

export type ExtensionHuntUser = {
  id: string;
  role: Role;
  plan: Plan;
  status: "active" | "paused";
  email: string;
  name: string;
};

/* Job-hunt calls from the extension re-read the account rather than trusting
   the token's claims, so a downgrade, a pause or a deletion takes effect on
   the next call instead of when the seven-day token expires. */
export async function getExtensionHuntUser(req: Request): Promise<ExtensionHuntUser | { error: string; status: number }> {
  const ext = await getExtensionUser(req);
  if (!ext) return { error: "Unauthorized", status: 401 };
  await dbConnect();
  const u = (await User.findById(ext.id, "name email role plan status deletingAt").lean()) as
    | { name?: string; email?: string; role: Role; plan?: string; status?: string; deletingAt?: Date | null }
    | null;
  if (!u || u.deletingAt) return { error: "Unauthorized", status: 401 };
  if (u.status === "paused") return { error: "Your account is paused.", status: 423 };
  const user: ExtensionHuntUser = {
    id: ext.id,
    role: u.role,
    plan: u.plan === "premium" ? "premium" : "free",
    status: "active",
    email: u.email ?? "",
    name: u.name ?? "",
  };
  if (!(await jobHuntAllowed(user))) return { error: "Job hunt is not available on your plan.", status: 403 };
  return user;
}
