import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SavedSearches from "@/components/jobs/SavedSearches";

export const metadata = { title: "Saved searches" };

export default function SearchesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/me/jobs" className="text-muted inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft size={14} aria-hidden="true" /> Job inbox
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Saved searches</h1>
        <p className="text-muted mt-1 text-sm">
          Each search runs every morning against the Bundesagentur für Arbeit job board and Adzuna, and keeps only jobs posted in
          your window. LinkedIn, XING and StepStone results come in through the extension when you open your saved searches there.
        </p>
      </div>
      <SavedSearches />
    </div>
  );
}
