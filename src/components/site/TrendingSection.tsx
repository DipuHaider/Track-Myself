import { TrendingUp, Layers } from "lucide-react";

const JOB_ROLES = [
  { title: "Software Engineer", count: 1240, pct: 100 },
  { title: "Product Manager", count: 870, pct: 70 },
  { title: "Data Analyst", count: 720, pct: 58 },
  { title: "UX Designer", count: 610, pct: 49 },
  { title: "DevOps Engineer", count: 540, pct: 44 },
  { title: "Marketing Specialist", count: 430, pct: 35 },
];

const PLATFORMS = [
  { name: "LinkedIn", pct: 62, color: "#0a66c2" },
  { name: "Company Website", pct: 48, color: "#7c3aed" },
  { name: "Indeed", pct: 35, color: "#003a9b" },
  { name: "Facebook Group", pct: 22, color: "#1877f2" },
  { name: "Glassdoor", pct: 18, color: "#0caa41" },
  { name: "Referral", pct: 15, color: "#f97316" },
];

export default function TrendingSection() {
  return (
    <section id="trending" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 text-center">
        <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ color: "var(--primary)", borderColor: "var(--primary)" }}>
          Live Insights
        </span>
        <h2 className="mt-3 text-3xl font-bold">What&apos;s Trending</h2>
        <p className="text-muted mt-2 text-sm">Based on applications tracked across the platform</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Trending Job Roles */}
        <div className="surface rounded-2xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp size={18} style={{ color: "var(--primary)" }} />
            <h3 className="font-semibold">Top Job Roles Being Tracked</h3>
          </div>
          <ul className="space-y-3">
            {JOB_ROLES.map((role, i) => (
              <li key={role.title}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted w-4 text-xs font-bold">#{i + 1}</span>
                    {role.title}
                  </span>
                  <span className="text-muted text-xs">{role.count.toLocaleString()} apps</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${role.pct}%`,
                      background: "linear-gradient(90deg, var(--primary), var(--accent))",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Platforms */}
        <div className="surface rounded-2xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Layers size={18} style={{ color: "var(--accent)" }} />
            <h3 className="font-semibold">Most Used Platforms</h3>
          </div>
          <ul className="space-y-3">
            {PLATFORMS.map((p) => (
              <li key={p.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted text-xs font-medium">{p.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${p.pct}%`, background: p.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
