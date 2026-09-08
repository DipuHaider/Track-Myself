"use client";

import { Crown, PenLine, ShieldCheck, Star, User } from "lucide-react";
import { TIER_LABELS, roleTier, type RoleTier } from "@/lib/permissions";

type IconProps = { size?: number; className?: string };

export const TIER_ICON: Record<RoleTier, React.ComponentType<IconProps>> = {
  superadmin: Crown,
  admin: ShieldCheck,
  editor: PenLine,
  premium: Star,
  free: User,
};

export const TIER_COLOR: Record<RoleTier, { fg: string; bg: string }> = {
  superadmin: { fg: "#c2410c", bg: "#fff7ed" },
  admin:      { fg: "#b91c1c", bg: "#fee2e2" },
  editor:     { fg: "#1d4ed8", bg: "#dbeafe" },
  premium:    { fg: "#b45309", bg: "#fef3c7" },
  free:       { fg: "var(--muted-foreground)", bg: "var(--surface-2)" },
};

export function RoleIcon({
  role, plan, size = 12, className,
}: {
  role?: string | null;
  plan?: string | null;
  size?: number;
  className?: string;
}) {
  const tier = roleTier(role, plan);
  const Icon = TIER_ICON[tier];
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export default function RoleAvatar({
  name, image, role, plan, size = 28, showTierBadge = true,
}: {
  name?: string | null;
  image?: string | null;
  role?: string | null;
  plan?: string | null;
  size?: number;
  showTierBadge?: boolean;
}) {
  const tier = roleTier(role, plan);
  const Icon = TIER_ICON[tier];
  const colors = TIER_COLOR[tier];
  const label = `${name || "Account"} — ${TIER_LABELS[tier]}`;
  const badgeSize = Math.max(12, Math.round(size * 0.42));

  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
      title={label}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-full object-cover"
          style={{ background: colors.bg }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-full"
          style={{ background: colors.bg, color: colors.fg }}
        >
          <Icon size={Math.round(size * 0.55)} />
        </span>
      )}

      {showTierBadge && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border"
          style={{
            width: badgeSize,
            height: badgeSize,
            background: colors.bg,
            color: colors.fg,
            borderColor: "var(--surface)",
          }}
        >
          <Icon size={Math.round(badgeSize * 0.62)} />
        </span>
      )}

      <span className="sr-only">{label}</span>
    </span>
  );
}
