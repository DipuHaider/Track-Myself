import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (!isAdmin(role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted mt-1 text-sm">
          System configuration. Available to admins and superadmins only.
        </p>
      </div>

      <section className="surface rounded-xl border p-5">
        <h3 className="mb-2 font-semibold">General</h3>
        <p className="text-muted text-sm">
          Profile, notifications, reminders, and account preferences — coming soon.
        </p>
      </section>
    </div>
  );
}
