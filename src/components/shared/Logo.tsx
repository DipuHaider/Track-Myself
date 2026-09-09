import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="logo-bolt shrink-0"
      style={{ color: "var(--logo-bolt)" }}
    >
      <path
        d="M36 8 L18 35 L30 35 L28 56 L46 29 L34 29 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      Track<span className="wordmark-tail">Myself</span>
    </span>
  );
}

export function Logo({
  size = 28,
  showText = true,
  href = "/",
  textSize = "text-sm",
  lit = false,
  onDark = false,
}: {
  size?: number;
  showText?: boolean;
  href?: string | null;
  textSize?: string;
  lit?: boolean;
  onDark?: boolean;
}) {
  const content = (
    <span
      className={`flex select-none items-center gap-2.5 ${lit ? "logo-lit" : ""} ${
        onDark ? "logo-on-dark" : ""
      }`}
    >
      <LogoMark size={size} />
      {showText && <Wordmark className={textSize} />}
    </span>
  );

  return href ? (
    <Link href={href} className="inline-flex shrink-0" aria-label="TrackMyself home">
      {content}
    </Link>
  ) : (
    <span className="inline-flex shrink-0">{content}</span>
  );
}
