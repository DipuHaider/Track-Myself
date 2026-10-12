import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "pdf-splitter",
  title: "PDF Splitter",
  description: "Extract pages from a PDF by range, or split every page into its own file. Runs entirely in your browser — the document is never uploaded.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
