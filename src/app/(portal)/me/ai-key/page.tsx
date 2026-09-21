import AiKeyForm from "@/components/ai/AiKeyForm";

export default function AiKeyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI key</h1>
        <p className="text-muted mt-1 text-sm">
          Bring your own API key to switch on CV tailoring, interview question generation and
          banner briefs. Everything runs on your provider account, so there is no plan to buy
          and no shared quota to queue behind.
        </p>
      </div>

      <AiKeyForm />
    </div>
  );
}
