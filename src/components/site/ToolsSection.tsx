import Link from "next/link";
import { ArrowRight, ImageIcon, Scissors, Zap } from "lucide-react";

const TOOLS = [
  {
    href: "/tools/image-optimizer",
    icon: ImageIcon,
    color: "#6366f1",
    gradient: "from-indigo-500/10 to-purple-500/5",
    title: "Image Optimizer",
    description:
      "Compress JPEG, PNG and WebP images right in your browser. Adjust quality, pick output format, and download — nothing ever leaves your device.",
    tags: ["JPEG", "PNG", "WebP"],
  },
  {
    href: "/tools/pdf-splitter",
    icon: Scissors,
    color: "#10b981",
    gradient: "from-emerald-500/10 to-teal-500/5",
    title: "PDF Splitter",
    description:
      "Extract any pages from a PDF by entering a range like 1-3, 5, 8-10. Or split every page into its own file. Pure browser — no server involved.",
    tags: ["Extract pages", "Split", "PDF"],
  },
] as const;

export default function ToolsSection() {
  return (
    <section id="tools" className="mx-auto max-w-6xl px-6 py-20">
      {/* Heading */}
      <div className="mb-12 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ color: "var(--primary)", borderColor: "var(--primary)" }}
        >
          <Zap size={11} />
          Free Utilities
        </span>
        <h2 className="mt-3 text-3xl font-bold">Built-in Tools</h2>
        <p className="text-muted mt-2 text-sm">
          Browser-based utilities — your files never leave your device
        </p>
      </div>

      {/* Tool cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {TOOLS.map(({ href, icon: Icon, color, gradient, title, description, tags }) => (
          <Link
            key={href}
            href={href}
            className={`surface group relative overflow-hidden rounded-2xl border p-7 transition hover:-translate-y-0.5 hover:shadow-lg`}
          >
            {/* Subtle gradient blob */}
            <div
              className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${gradient} blur-2xl transition group-hover:scale-125`}
            />

            <div className="relative">
              {/* Icon */}
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: color + "20", color }}
              >
                <Icon size={22} />
              </div>

              {/* Title */}
              <h3 className="mb-2 text-xl font-semibold">{title}</h3>

              {/* Description */}
              <p className="text-muted text-sm leading-relaxed">{description}</p>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: color + "15", color }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div
                className="mt-6 flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-3"
                style={{ color }}
              >
                Try it free <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View all link */}
      <div className="mt-8 text-center">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm font-medium transition hover:underline"
          style={{ color: "var(--primary)" }}
        >
          View all tools <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
