"use client";

import { useRouter } from "next/navigation";
import ApplicationForm from "@/components/applications/ApplicationForm";

export default function CreateApplicationPage() {
  const router = useRouter();

  const createApplication = async (data: {
    companyName: string;
    jobTitle: string;
    applicationStatus: string;
  }) => {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) router.push("/applications");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Create Application</h2>
      <ApplicationForm onSubmit={createApplication} />
    </div>
  );
}
