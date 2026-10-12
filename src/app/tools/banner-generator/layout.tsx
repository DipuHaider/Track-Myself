import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "banner-generator",
  title: "Banner Generator & Resizer",
  description: "Generate profile banners at exact platform sizes — LinkedIn 1584×396, GitHub 1280×640, X 1500×500 — with safe zones drawn on, or resize a photo you already have.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
