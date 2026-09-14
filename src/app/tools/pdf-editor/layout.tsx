import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF Editor — TrackMyself",
  description:
    "Open a PDF, correct the text, add notes or a signature, reorder pages, and export. Runs in your browser.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
