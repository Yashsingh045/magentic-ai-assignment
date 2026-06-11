import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  trend?: { value: string; positive?: boolean };
}

/** Compact metric card for dashboards/analytics. */
export function StatCard({ label, value, icon, hint, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {icon && (
          <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </div>
      {(hint || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "font-medium",
                trend.positive ? "text-green-600" : "text-red-600",
              )}
            >
              {trend.positive ? "▲" : "▼"} {trend.value}
            </span>
          )}
          {hint && <span className="text-gray-400">{hint}</span>}
        </div>
      )}
    </div>
  );
}
