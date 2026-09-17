export type FlagCode = "bd" | "de" | "gb" | "us";

const STRIPE = 100 / 13;

const FLAGS: Record<FlagCode, { viewBox: string; body: React.ReactNode }> = {
  bd: {
    viewBox: "0 0 50 30",
    body: (
      <>
        <rect width="50" height="30" fill="#006a4e" />
        <circle cx="22.5" cy="15" r="9" fill="#f42a41" />
      </>
    ),
  },
  de: {
    viewBox: "0 0 50 30",
    body: (
      <>
        <rect width="50" height="30" fill="#ffce00" />
        <rect width="50" height="20" fill="#dd0000" />
        <rect width="50" height="10" fill="#000000" />
      </>
    ),
  },
  gb: {
    viewBox: "0 0 60 30",
    body: (
      <>
        <clipPath id="flag-gb-diagonals">
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#flag-gb-diagonals)"
          stroke="#c8102e"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
      </>
    ),
  },
  us: {
    viewBox: "0 0 190 100",
    body: (
      <>
        <rect width="190" height="100" fill="#ffffff" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} y={i * STRIPE} width="190" height={STRIPE} fill="#b31942" />
        ))}
        <rect width="76" height={STRIPE * 7} fill="#3c3b6e" />
        {Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={7 + col * 12.4}
              cy={6 + row * 10.7}
              r="3"
              fill="#ffffff"
            />
          )),
        )}
      </>
    ),
  },
};

export default function FlagIcon({
  code,
  label,
  width = 20,
  height = 14,
  className,
}: {
  code: FlagCode;
  label: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const flag = FLAGS[code];

  return (
    <svg
      width={width}
      height={height}
      viewBox={flag.viewBox}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
      className={className}
      style={{ display: "block" }}
    >
      {flag.body}
    </svg>
  );
}
