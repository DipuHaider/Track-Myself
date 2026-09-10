"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import AppDocModal, { type AppInfo } from "@/components/applications/AppDocModal";

export type { AppInfo } from "@/components/applications/AppDocModal";

export default function AppDocButton({ info }: { info: AppInfo }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--border)" }}
        title={`Generate documents for ${info.jobTitle} at ${info.companyName}`}
      >
        <Sparkles size={11} aria-hidden="true" />
        Generate
      </button>

      {open && <AppDocModal info={info} onClose={() => setOpen(false)} />}
    </>
  );
}
