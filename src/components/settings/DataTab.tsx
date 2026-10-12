"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import AccountControls from "@/components/portal/AccountControls";
import { ApiError, downloadFile } from "@/lib/api/client";

export default function DataTab() {
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      const name = await downloadFile("/api/user/account/export", {}, "trackmyself-export.json");
      toast.success(`Saved ${name}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not prepare the export.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface rounded-xl border p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <Download size={16} className="text-primary" aria-hidden="true" />
          Download my data
        </h2>
        <p className="text-muted mb-4 text-sm">
          One JSON file with your profile, every application, interview, reminder, to-do, notification and CV content.
          Uploaded files are listed by name; download them from My Documents.
        </p>
        <button
          type="button"
          onClick={exportData}
          disabled={busy}
          className="btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
          {busy ? "Preparing…" : "Download JSON"}
        </button>
      </section>

      <AccountControls />
    </div>
  );
}
