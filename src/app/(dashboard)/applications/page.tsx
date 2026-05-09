"use client";

import ApplicationTable from "@/components/applications/ApplicationTable";
import ApplicationFilters from "@/components/applications/ApplicationFilters";
import { useApplications } from "@/hooks/useApplications";

export default function ApplicationsPage() {
  const { applications, loading } = useApplications();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Applications</h2>
      <ApplicationFilters />
      {loading ? <p className="text-sm text-zinc-600">Loading...</p> : null}
      <ApplicationTable applications={applications} />
    </div>
  );
}
