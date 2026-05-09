export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className="surface-muted inline-flex rounded-full px-2.5 py-1 text-xs font-medium">
      {status}
    </span>
  );
}
