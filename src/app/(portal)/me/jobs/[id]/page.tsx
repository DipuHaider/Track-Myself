import { notFound } from "next/navigation";
import LeadReview from "@/components/jobs/LeadReview";
import { isObjectIdString } from "@/lib/objectId";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isObjectIdString(id)) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <LeadReview id={id} />
    </div>
  );
}
