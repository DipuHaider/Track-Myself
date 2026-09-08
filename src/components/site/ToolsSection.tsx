import Link from "next/link";
import {
  ArrowRight, Eraser, ImageIcon, Layers, ScanText, Scissors, Sparkles,
} from "lucide-react";
import { SITE_TOOLS, type SiteTool } from "@/lib/siteTools";

const ICONS: Record<SiteTool["icon"], React.ComponentType<{ size?: number }>> = {
  image: ImageIcon,
  scissors: Scissors,
  scan: ScanText,
  eraser: Eraser,
  sparkles: Sparkles,
  layers: Layers,
};

export default function ToolsSection() {
  return (
    <section id="tools" className="surface-muted border-y">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Six tools · no account
            </p>
            <h2 className="mt-3 text-3xl font-bold" style={{ textWrap: "balance" }}>
              The bits of a job hunt<br />nobody warns you about.
            </h2>
          </div>
          <p className="text-muted max-w-sm text-sm leading-relaxed">
            Every one of these runs inside your browser. The background remover and profile
            generator load an on-device model — your photos are never uploaded anywhere.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3"
          style={{ background: "var(--border)" }}>
          {SITE_TOOLS.map((tool) => {
            const Icon = ICONS[tool.icon];
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="surface group flex flex-col gap-3 p-7 transition hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: `${tool.color}1a`, color: tool.color }}
                  >
                    <Icon size={19} />
                  </span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: tool.badge === "AI" ? tool.color : "var(--muted-foreground)" }}
                  >
                    {tool.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold">{tool.title}</h3>
                  <p className="text-muted mt-0.5 text-xs">{tool.short}</p>
                </div>

                <p className="text-muted flex-1 text-sm leading-relaxed">{tool.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-muted rounded border px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <span
                  className="mt-1 flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5"
                  style={{ color: tool.color }}
                >
                  Open <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
