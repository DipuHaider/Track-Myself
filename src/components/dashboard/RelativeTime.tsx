"use client";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function relativeTime(value: string | Date | null | undefined, now = Date.now()): string {
  if (!value) return "Never";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "Never";
  const seconds = Math.round((t - now) / 1000);
  if (Math.abs(seconds) < 60) return "Just now";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "Just now";
}

export default function RelativeTime({
  value, fallback = "Never", className,
}: {
  value: string | Date | null | undefined;
  fallback?: string;
  className?: string;
}) {
  if (!value) return <span className={className}>{fallback}</span>;
  const date = new Date(value);
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()} className={className}>
      {relativeTime(date)}
    </time>
  );
}
