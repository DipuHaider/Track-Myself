import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF Splitter",
  description: "Extract pages from a PDF by range, or split every page into its own file. Runs entirely in your browser — the document is never uploaded.",
  alternates: { canonical: "/tools/pdf-splitter" },
  openGraph: {
    title: "PDF Splitter · TrackMyself",
    description: "Extract pages from a PDF by range, or split every page into its own file. Runs entirely in your browser — the document is never uploaded.",
    url: "/tools/pdf-splitter",
  },
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
