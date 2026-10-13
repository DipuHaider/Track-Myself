import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { getSessionUser } from "@/lib/serverAuth";
import { jobHuntAllowed } from "@/lib/jobs/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job hunt" };

export default async function JobsLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!(await jobHuntAllowed(user))) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="surface rounded-xl border p-6">
          <h1 className="mb-2 flex items-center gap-2 text-xl font-semibold"><Radar size={18} aria-hidden="true" /> Job hunt</h1>
          <p className="text-muted text-sm">
            A daily search of new jobs, a tailored CV and cover letter for the ones you pick, help filling the application,
            and a daily report. It is rolling out to Premium accounts.
          </p>
          <Link href="/pricing" className="btn-primary mt-4 inline-flex rounded-md px-4 py-2 text-sm">See plans</Link>
        </section>
      </div>
    );
  }
  return children;
}
