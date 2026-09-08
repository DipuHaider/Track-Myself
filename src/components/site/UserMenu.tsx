"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut, UserCircle } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import RoleAvatar, { RoleIcon } from "@/components/shared/RoleAvatar";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export default function UserMenu({
  name, email, image, role, plan, isBackendUser, navLinks = [],
}: {
  name: string;
  email: string;
  image: string;
  role: string;
  plan: string;
  isBackendUser: boolean;
  navLinks?: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 transition hover:bg-[var(--surface-2)]"
      >
        <RoleAvatar name={name} image={image} role={role} plan={plan} size={28} />
        <span className="hidden max-w-[9rem] truncate text-sm sm:block">{name}</span>
        <ChevronDown size={13} className="text-muted shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="surface absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border shadow-xl"
        >
          <div className="flex items-center gap-3 border-b px-3 py-3">
            <RoleAvatar name={name} image={image} role={role} plan={plan} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-muted truncate text-[11px]">{email}</p>
            </div>
          </div>

          {navLinks.length > 0 && (
            <div className="border-b p-1.5 md:hidden">
              {navLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  role="menuitem"
                  onClick={close}
                  className="block rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
                >
                  {label}
                </a>
              ))}
            </div>
          )}

          <div className="p-1.5">
            {isBackendUser && (
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
              >
                <LayoutDashboard size={15} aria-hidden="true" />
                Dashboard
              </Link>
            )}

            <Link
              href="/me"
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
            >
              <UserCircle size={15} aria-hidden="true" />
              My Profile
            </Link>

            <ThemeToggle variant="menu" />
          </div>

          <div className="border-t p-1.5">
            {role && (
              <p className="px-3 pb-1.5 pt-0.5">
                <span className={`role-badge role-${role} inline-flex items-center gap-1 text-[10px]`}>
                  <RoleIcon role={role} plan={plan} size={10} />
                  {ROLE_LABELS[role as Role] ?? role}
                </span>
              </p>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => { close(); signOut({ callbackUrl: "/" }); }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-500 transition hover:bg-red-50"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
