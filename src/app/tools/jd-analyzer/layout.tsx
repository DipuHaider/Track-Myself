import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata({
  slug: "jd-analyzer",
  title: "JD Analyser",
  description: "Paste a job description and extract the technical skills, soft skills, seniority signals and keywords worth mirroring in your CV and cover letter.",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
