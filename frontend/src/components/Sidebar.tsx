"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IconChevronLeft, IconClose, IconSparkles } from "./icons";
import { NAV_ITEMS } from "./nav";

interface SidebarProps {
  /** Desktop: icon-only rail when true. */
  collapsed: boolean;
  /** Mobile: drawer open when true. */
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-all duration-200 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <IconSparkles className="h-5 w-5" />
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold text-gray-900">
              AI Support
            </span>
          )}
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Close menu"
          >
            <IconClose />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  collapsed && "lg:justify-center lg:px-2",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-gray-200 p-3 lg:block">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <IconChevronLeft
              className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
