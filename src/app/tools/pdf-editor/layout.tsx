import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "pdf-editor",
  title: "PDF Editor",
  description: "Open a PDF, correct the text, add notes or a signature, reorder pages, and export. Runs in your browser.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
