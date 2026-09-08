import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Optimizer",
  description: "Compress and convert JPEG, PNG and WebP images in your browser. Adjust quality, see the saving before you download, and keep every file on your own device.",
  alternates: { canonical: "/tools/image-optimizer" },
  openGraph: {
    title: "Image Optimizer · TrackMyself",
    description: "Compress and convert JPEG, PNG and WebP images in your browser. Adjust quality, see the saving before you download, and keep every file on your own device.",
    url: "/tools/image-optimizer",
  },
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
