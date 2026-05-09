"use client";

import { useRouter } from "next/navigation";
import ApplicationForm from "@/components/applications/ApplicationForm";

export default function EditApplicationPage() {
  const router = useRouter();

  const updateApplication = async (data: {
    companyName: string;
    jobTitle: string;
    applicationStatus: string;
  }) => {
    // id-based prefill/update will be wired in next iteration.
    await Promise.resolve(data);
    router.push("/applications");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Edit Application</h2>
      <ApplicationForm onSubmit={updateApplication} />
    </div>
  );
}
