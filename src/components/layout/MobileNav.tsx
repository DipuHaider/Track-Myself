"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { canDo, type DashboardAction } from "@/lib/permissions";

const NAV_ITEMS: { href: string; label: string; action?: DashboardAction; exact?: boolean }[] = [
  { href: "/dashboard",       label: "Dashboard",    exact: true                  },
  { href: "/applications",    label: "Applications", action: "view:applications"  },
  { href: "/analytics",       label: "Analytics",    action: "view:analytics"     },
  { href: "/dashboard/users", label: "Users",        action: "view:users"         },
  { href: "/profile",         label: "Profile"                                    },
  { href: "/settings",        label: "Settings",     action: "view:settings"      },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const visible = NAV_ITEMS.filter((item) => !item.action || canDo(role, item.action));

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <nav aria-label="Dashboard navigation" className="surface border-b px-4 py-2 md:hidden">
      <ul className="flex flex-wrap gap-1.5" role="list">
        {visible.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-[var(--primary)] text-white"
                    : "hover:bg-[var(--surface-2)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
