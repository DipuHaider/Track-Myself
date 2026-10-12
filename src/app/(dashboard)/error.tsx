"use client";

import ErrorPanel from "@/components/shared/ErrorPanel";

export default function DashboardError(props: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  return <ErrorPanel {...props} zone="dashboard page" homeHref="/dashboard" homeLabel="Dashboard" />;
}
