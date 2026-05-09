import InterviewStages from "@/components/applications/InterviewStages";

type Props = { params: Promise<{ id: string }> };

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Application Detail</h2>
      <p className="text-zinc-600">Application ID: {id}</p>
      <InterviewStages />
    </div>
  );
}
