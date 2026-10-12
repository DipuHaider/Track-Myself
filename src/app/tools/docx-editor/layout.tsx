import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "docx-editor",
  title: "Word Text Editor",
  description: "Fix the wording in a .docx without Word. Styles, images and layout are repacked untouched. Runs in your browser.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
