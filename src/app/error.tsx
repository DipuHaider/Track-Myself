"use client";

import ErrorPanel from "@/components/shared/ErrorPanel";

export default function RootError(props: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  return (
    <div className="min-h-screen px-6 pt-16">
      <ErrorPanel {...props} zone="page" />
    </div>
  );
}
