import Link from "next/link";

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tm-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#tm-grad)" />
      <rect x="6" y="22" width="4" height="5" rx="1" fill="rgba(255,255,255,0.4)" />
      <rect x="12" y="17" width="4" height="10" rx="1" fill="rgba(255,255,255,0.65)" />
      <rect x="18" y="12" width="4" height="15" rx="1" fill="white" />
      <path
        d="M19 8 L21.5 10.5 L27 5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  size = 28,
  showText = true,
  href = "/",
  textSize = "text-sm",
}: {
  size?: number;
  showText?: boolean;
  href?: string;
  textSize?: string;
}) {
  const content = (
    <span className="flex items-center gap-2 select-none">
      <LogoMark size={size} />
      {showText && (
        <span className={`${textSize} font-bold leading-none tracking-tight`}>
          Track<span style={{ color: "var(--primary)" }}>Myself</span>
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} className="inline-flex shrink-0">
      {content}
    </Link>
  ) : (
    <span className="inline-flex shrink-0">{content}</span>
  );
}
