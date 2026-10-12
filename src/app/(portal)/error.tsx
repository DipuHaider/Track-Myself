"use client";

import ErrorPanel from "@/components/shared/ErrorPanel";

export default function PortalError(props: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  return <ErrorPanel {...props} zone="page" homeHref="/me" homeLabel="My TrackMyself" />;
}
