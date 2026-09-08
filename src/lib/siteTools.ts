export type SiteTool = {
  href: string;
  icon: "image" | "scissors" | "scan" | "eraser" | "sparkles" | "layers";
  color: string;
  title: string;
  short: string;
  description: string;
  tags: string[];
  badge: string;
};

export const SITE_TOOLS: SiteTool[] = [
  {
    href: "/tools/bg-remover",
    icon: "eraser",
    color: "#8b5cf6",
    title: "Background Remover",
    short: "Cut a photo out of its background",
    description:
      "Portrait matting runs on your device, so hair edges survive. Drop in any colour behind it and download an optimised image.",
    tags: ["On-device AI", "PNG", "Transparent"],
    badge: "AI",
  },
  {
    href: "/tools/profile-image",
    icon: "sparkles",
    color: "#0ea5e9",
    title: "Profile Image Generator",
    short: "Headshots at the size each platform wants",
    description:
      "Background removed, lighting corrected from the photo itself, cropped to circle, rounded or square at LinkedIn, GitHub and CV dimensions.",
    tags: ["LinkedIn 400²", "GitHub 460²", "CV 35×45mm"],
    badge: "AI",
  },
  {
    href: "/tools/banner-generator",
    icon: "layers",
    color: "#f97316",
    title: "Banner Generator",
    short: "Profile banners with the safe zones drawn on",
    description:
      "Describe yourself and get a banner at exact platform dimensions — with LinkedIn's avatar overlap and X's mobile crop marked, so nothing important gets hidden.",
    tags: ["1584×396", "1500×500", "1280×640"],
    badge: "AI",
  },
  {
    href: "/tools/jd-analyzer",
    icon: "scan",
    color: "#e11d48",
    title: "JD Analyser",
    short: "Read a job ad the way a parser does",
    description:
      "Paste a job description and see the technical skills, soft skills, seniority signal and keywords worth mirroring in your CV.",
    tags: ["Skills", "Keywords", "ATS"],
    badge: "Free",
  },
  {
    href: "/tools/image-optimizer",
    icon: "image",
    color: "#6366f1",
    title: "Image Optimizer",
    short: "Compress without leaving the tab",
    description:
      "Shrink JPEG, PNG and WebP files, convert between formats and see the saving before you download.",
    tags: ["JPEG", "PNG", "WebP"],
    badge: "Free",
  },
  {
    href: "/tools/pdf-splitter",
    icon: "scissors",
    color: "#10b981",
    title: "PDF Splitter",
    short: "Pull pages out of a PDF",
    description:
      "Enter a range like 1-3, 5, 8-10 and keep only those pages, or split every page into its own file.",
    tags: ["Extract", "Split", "PDF"],
    badge: "Free",
  },
];
