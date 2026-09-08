import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JD Analyser",
  description: "Paste a job description and extract the technical skills, soft skills, seniority signals and keywords worth mirroring in your CV and cover letter.",
  alternates: { canonical: "/tools/jd-analyzer" },
  openGraph: {
    title: "JD Analyser · TrackMyself",
    description: "Paste a job description and extract the technical skills, soft skills, seniority signals and keywords worth mirroring in your CV and cover letter.",
    url: "/tools/jd-analyzer",
  },
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
