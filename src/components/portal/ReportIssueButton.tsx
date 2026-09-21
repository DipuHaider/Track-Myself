"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import ReportIssueModal from "@/components/shared/ReportIssueModal";

export default function ReportIssueButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
      >
        <LifeBuoy size={15} aria-hidden="true" />
        Report an issue
      </button>

      {open && <ReportIssueModal open onClose={() => setOpen(false)} />}
    </>
  );
}
