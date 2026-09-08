import Link from "next/link";
import { ImageIcon, Scissors, ScanText, ArrowRight, Eraser, Sparkles, Layers } from "lucide-react";

const TOOLS = [
  {
    href: "/tools/bg-remover",
    icon: Eraser,
    color: "#8b5cf6",
    title: "Background Remover",
    description:
      "Cut the background out of any photo with on-device AI, drop in a colour of your choice, and download an optimised image. Premium unlocks full resolution and every format.",
    badge: "Client-side AI",
  },
  {
    href: "/tools/profile-image",
    icon: Sparkles,
    color: "#0ea5e9",
    title: "Profile Image Generator",
    description:
      "Turn a photo into a clean headshot — background removed, lighting auto-corrected, cropped to circle, rounded or square at the exact size LinkedIn, GitHub and your CV expect.",
    badge: "Client-side AI",
  },
  {
    href: "/tools/banner-generator",
    icon: Layers,
    color: "#f97316",
    title: "Banner Generator & Resizer",
    description:
      "Describe yourself and get a profile banner at the exact size LinkedIn, GitHub and X expect — safe zones drawn on, or resize a photo you already have.",
    badge: "Client-side",
  },
  {
    href: "/tools/image-optimizer",
    icon: ImageIcon,
    color: "#6366f1",
    title: "Image Optimizer",
    description:
      "Compress JPEG, PNG and WebP images right in your browser. Adjust quality, convert formats, and download instantly — no upload to any server.",
    badge: "Client-side",
  },
  {
    href: "/tools/pdf-splitter",
    icon: Scissors,
    color: "#10b981",
    title: "PDF Splitter",
    description:
      "Extract specific pages from a PDF file. Enter a page range like 1-3, 5, 8-10 and download the extracted document — works entirely in your browser.",
    badge: "Client-side",
  },
  {
    href: "/tools/jd-analyzer",
    icon: ScanText,
    color: "#f97316",
    title: "JD Analyser",
    description:
      "Paste any job description and instantly extract technical skills, soft skills, seniority level, work type, and the top keywords to mirror in your CV.",
    badge: "Client-side",
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tools</h1>
        <p className="text-muted mt-2 text-sm">
          Free browser-based utilities. Your files never leave your device.
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ href, icon: Icon, color, title, description, badge }) => (
          <Link
            key={href}
            href={href}
            className="surface group flex flex-col gap-4 rounded-xl border p-6 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ background: color + "1a", color }}
              >
                <Icon size={24} />
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: color + "1a", color }}
              >
                {badge}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="mb-1.5 text-lg font-semibold">{title}</h2>
              <p className="text-muted text-sm leading-relaxed">{description}</p>
            </div>

            <div
              className="flex items-center gap-1.5 text-sm font-medium transition group-hover:gap-2.5"
              style={{ color }}
            >
              Open tool <ArrowRight size={15} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
