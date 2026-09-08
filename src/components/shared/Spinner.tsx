import { Loader2 } from "lucide-react";

export function Spinner({
  size = 18,
  className = "",
  label = "Loading",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <>
      <Loader2
        size={size}
        className={`animate-spin ${className}`}
        style={{ color: "var(--primary)" }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </>
  );
}

export default function Loading({
  size = 22,
  className = "",
  padded = true,
  label = "Loading",
}: {
  size?: number;
  className?: string;
  padded?: boolean;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center ${padded ? "py-16" : ""} ${className}`}
    >
      <Spinner size={size} label={label} />
    </div>
  );
}

export function InlineSpinner({ size = 13, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <Spinner size={size} label={label} />
    </span>
  );
}

export function FullPageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center"
    >
      <Spinner size={30} label={label} />
    </main>
  );
}
