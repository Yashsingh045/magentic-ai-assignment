"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/Button";
import { IconLogout, IconMenu } from "./icons";
import { NAV_ITEMS } from "./nav";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {current?.label ?? "Dashboard"}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs capitalize text-gray-500">
                {user.role.toLowerCase()}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials(user.name)}
            </span>
          </>
        )}
        <Button variant="secondary" size="sm" onClick={logout}>
          <IconLogout className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
