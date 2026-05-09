export default function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <article className="surface rounded-lg border p-4">
      <p className="text-muted text-sm">{title}</p>
      <p className="text-primary mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}
