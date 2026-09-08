import Link from "next/link";
import { ImageIcon, Scissors, ScanText, ArrowRight, Eraser, Sparkles, Layers } from "lucide-react";
import { SITE_TOOLS, type SiteTool } from "@/lib/siteTools";

const ICONS: Record<SiteTool["icon"], React.ComponentType<{ size?: number }>> = {
  image: ImageIcon,
  scissors: Scissors,
  scan: ScanText,
  eraser: Eraser,
  sparkles: Sparkles,
  layers: Layers,
};

const TOOLS = SITE_TOOLS;

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
        {TOOLS.map(({ href, icon, color, title, description, badge }) => {
          const Icon = ICONS[icon];
          return (
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
          );
        })}
      </div>
    </div>
  );
}
