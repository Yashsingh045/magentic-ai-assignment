import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "gray" | "green" | "amber" | "red" | "indigo";

const tones: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

const dotTones: Record<Tone, string> = {
  gray: "bg-gray-400",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  /** Show a leading dot; `pulse` animates it (e.g. PROCESSING). */
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({ tone = "gray", children, dot, pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dotTones[tone],
            pulse && "animate-pulse",
          )}
        />
      )}
      {children}
    </span>
  );
}
