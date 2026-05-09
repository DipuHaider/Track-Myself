"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import { APPLICATION_STATUSES, PLATFORMS } from "@/constants/applicationStatus";
import type { Application } from "@/types/application";

type FormData = {
  companyName: string;
  jobTitle: string;
  platform: string;
  applicationStatus: string;
  country: string;
  salary: string;
  jobPostUrl: string;
  appliedDate: string;
  priority: string;
  notes: string;
};

const EMPTY: FormData = {
  companyName: "",
  jobTitle: "",
  platform: "",
  applicationStatus: "Wishlist",
  country: "",
  salary: "",
  jobPostUrl: "",
  appliedDate: "",
  priority: "Medium",
  notes: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]";

export default function AddApplicationModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (app: Application) => void;
}) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const reset = () => {
    setForm(EMPTY);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          appliedDate: form.appliedDate || undefined,
          jobPostUrl: form.jobPostUrl || undefined,
          platform: form.platform || undefined,
        }),
      });
      if (!res.ok) {
        setError("Failed to save. Please try again.");
        return;
      }
      const created = await res.json();
      onSaved(created);
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New Job Application">
      <form onSubmit={save}>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto px-5 py-4">
          {/* Row 1: Company + Job Title */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *">
              <input className={inputCls} placeholder="e.g. Google" value={form.companyName} onChange={set("companyName")} required />
            </Field>
            <Field label="Job Title *">
              <input className={inputCls} placeholder="e.g. Software Engineer" value={form.jobTitle} onChange={set("jobTitle")} required />
            </Field>
          </div>

          {/* Row 2: Status + Platform */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className={inputCls} value={form.applicationStatus} onChange={set("applicationStatus")}>
                {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Platform">
              <select className={inputCls} value={form.platform} onChange={set("platform")}>
                <option value="">Select platform</option>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 3: Country + Salary */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country">
              <input className={inputCls} placeholder="e.g. United Kingdom" value={form.country} onChange={set("country")} />
            </Field>
            <Field label="Salary">
              <input className={inputCls} placeholder="e.g. £50,000 / year" value={form.salary} onChange={set("salary")} />
            </Field>
          </div>

          {/* Row 4: Applied Date + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Applied Date">
              <input type="date" className={inputCls} value={form.appliedDate} onChange={set("appliedDate")} />
            </Field>
            <Field label="Priority">
              <select className={inputCls} value={form.priority} onChange={set("priority")}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </Field>
          </div>

          {/* Job Post URL */}
          <Field label="Job Post URL">
            <input type="url" className={inputCls} placeholder="https://..." value={form.jobPostUrl} onChange={set("jobPostUrl")} />
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea className={inputCls} rows={3} placeholder="Any notes about this application..." value={form.notes} onChange={set("notes")} />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Application"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
