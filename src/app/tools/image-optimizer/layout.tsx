import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "image-optimizer",
  title: "Image Optimizer",
  description: "Compress and convert JPEG, PNG and WebP images in your browser. Adjust quality, see the saving before you download, and keep every file on your own device.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
