"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAdmin, type DashboardAction } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";

const NAV_ITEMS: { href: string; label: string; action?: DashboardAction; adminOnly?: boolean; exact?: boolean }[] = [
  { href: "/dashboard",       label: "Dashboard",    exact: true                  },
  { href: "/applications",    label: "Applications", action: "view:applications"  },
  { href: "/analytics",       label: "Analytics",    action: "view:analytics"     },
  { href: "/dashboard/cv",    label: "CV",           action: "view:cv"            },
  { href: "/dashboard/users", label: "Users",        action: "view:users"         },
  { href: "/dashboard/rbac",  label: "Access",       adminOnly: true              },
  { href: "/profile",         label: "Profile"                                    },
  { href: "/settings",        label: "Settings",     action: "view:settings"      },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const { can } = usePermissions();

  const visible = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin(role)) return false;
    return !item.action || can(item.action);
  });

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
