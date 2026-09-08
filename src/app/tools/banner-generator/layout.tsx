import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Banner Generator & Resizer",
  description: "Generate profile banners at exact platform sizes — LinkedIn 1584×396, GitHub 1280×640, X 1500×500 — with safe zones drawn on, or resize a photo you already have.",
  alternates: { canonical: "/tools/banner-generator" },
  openGraph: {
    title: "Banner Generator & Resizer · TrackMyself",
    description: "Generate profile banners at exact platform sizes — LinkedIn 1584×396, GitHub 1280×640, X 1500×500 — with safe zones drawn on, or resize a photo you already have.",
    url: "/tools/banner-generator",
  },
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
