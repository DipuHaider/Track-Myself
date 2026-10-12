"use client";

import ErrorPanel from "@/components/shared/ErrorPanel";

export default function ToolsError(props: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  return <ErrorPanel {...props} zone="tool" homeHref="/tools" homeLabel="All tools" />;
}
