import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "profile-image",
  title: "Profile Image Generator",
  description: "Turn a photo into a clean headshot for LinkedIn, GitHub and your CV. Background removed, lighting auto-corrected, cropped to circle, rounded or square at the exact size each platform expects.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
