import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/serverAuth";
import { isAdmin, isSuperAdmin } from "@/lib/permissions";
import AccessControlPanel from "@/components/dashboard/AccessControlPanel";

export default async function AccessControlPage() {
  const user = await getSessionUser();
  if (!isAdmin(user?.role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Access Control</h2>
        <p className="text-muted mt-1 text-sm">
          Decide which role can do what across the dashboard. Superadmins and admins only.
        </p>
      </div>

      <AccessControlPanel isSuperAdmin={isSuperAdmin(user?.role)} />
    </div>
  );
}
