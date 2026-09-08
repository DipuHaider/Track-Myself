import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Background Remover",
  description: "Remove the background from any photo in your browser. Portrait matting keeps hair edges intact, add any colour behind it, and download an optimised PNG. Nothing is uploaded.",
  alternates: { canonical: "/tools/bg-remover" },
  openGraph: {
    title: "Background Remover · TrackMyself",
    description: "Remove the background from any photo in your browser. Portrait matting keeps hair edges intact, add any colour behind it, and download an optimised PNG. Nothing is uploaded.",
    url: "/tools/bg-remover",
  },
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
