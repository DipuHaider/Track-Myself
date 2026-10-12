import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "bg-remover",
  title: "Background Remover",
  description: "Remove the background from any photo in your browser. Portrait matting keeps hair edges intact, add any colour behind it, and download an optimised PNG. Nothing is uploaded.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
