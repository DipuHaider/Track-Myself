import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile Image Generator",
  description: "Turn a photo into a clean headshot for LinkedIn, GitHub and your CV. Background removed, lighting auto-corrected, cropped to circle, rounded or square at the exact size each platform expects.",
  alternates: { canonical: "/tools/profile-image" },
  openGraph: {
    title: "Profile Image Generator · TrackMyself",
    description: "Turn a photo into a clean headshot for LinkedIn, GitHub and your CV. Background removed, lighting auto-corrected, cropped to circle, rounded or square at the exact size each platform expects.",
    url: "/tools/profile-image",
  },
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
