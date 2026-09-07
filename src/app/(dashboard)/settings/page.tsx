import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/serverAuth";
import { isAdmin, isSuperAdmin } from "@/lib/permissions";
import SettingsPanel from "@/components/dashboard/SettingsPanel";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user?.role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted mt-1 text-sm">
          System configuration and data maintenance. Available to admins and superadmins only.
        </p>
      </div>

      <SettingsPanel isSuperAdmin={isSuperAdmin(user?.role)} />
    </div>
  );
}
