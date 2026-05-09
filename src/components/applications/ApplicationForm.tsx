"use client";

import { useState } from "react";

type ApplicationPayload = {
  companyName: string;
  jobTitle: string;
  applicationStatus: string;
};

export default function ApplicationForm({
  defaultValue,
  onSubmit,
}: {
  defaultValue?: ApplicationPayload;
  onSubmit: (data: ApplicationPayload) => Promise<void>;
}) {
  const [formData, setFormData] = useState<ApplicationPayload>(
    defaultValue ?? { companyName: "", jobTitle: "", applicationStatus: "Wishlist" },
  );
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="surface space-y-3 rounded-lg border p-4">
      <input
        className="w-full rounded-md border px-3 py-2"
        placeholder="Company name"
        value={formData.companyName}
        onChange={(e) => setFormData((v) => ({ ...v, companyName: e.target.value }))}
        required
      />
      <input
        className="w-full rounded-md border px-3 py-2"
        placeholder="Job title"
        value={formData.jobTitle}
        onChange={(e) => setFormData((v) => ({ ...v, jobTitle: e.target.value }))}
        required
      />
      <select
        className="w-full rounded-md border px-3 py-2"
        value={formData.applicationStatus}
        onChange={(e) => setFormData((v) => ({ ...v, applicationStatus: e.target.value }))}
      >
        <option>Wishlist</option>
        <option>Submitted</option>
        <option>No Response</option>
        <option>Interview Scheduled</option>
        <option>Offer Received</option>
        <option>Rejected</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary rounded-md px-4 py-2 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
