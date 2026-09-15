"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DigitalBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "blue" | "electric" | "cyan" | "green" | "amber" | "rose" | "zinc" | "red";
  dot?: boolean;
  pulsing?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DigitalBadge({
  variant = "blue",
  dot = false,
  pulsing = false,
  children,
  className,
  ...props
}: DigitalBadgeProps) {
  const variantStyles = {
    blue: {
      container: "border-cyan-500/40 bg-cyan-950/30 text-cyan-300",
      dot: "bg-cyan-400",
      pulse: "bg-cyan-400/75",
    },
    electric: {
      container: "border-blue-500/40 bg-blue-950/30 text-blue-300",
      dot: "bg-blue-400",
      pulse: "bg-blue-400/75",
    },
    cyan: {
      container: "border-cyan-400/40 bg-cyan-950/40 text-cyan-400",
      dot: "bg-cyan-400",
      pulse: "bg-cyan-400/75",
    },
    green: {
      container: "border-cyan-500/40 bg-cyan-950/30 text-cyan-300",
      dot: "bg-cyan-400",
      pulse: "bg-cyan-400/75",
    },
    red: {
      container: "border-rose-500/40 bg-rose-950/30 text-rose-300",
      dot: "bg-rose-500",
      pulse: "bg-rose-500/75",
    },
    rose: {
      container: "border-rose-500/40 bg-rose-950/30 text-rose-300",
      dot: "bg-rose-400",
      pulse: "bg-rose-400/75",
    },
    amber: {
      container: "border-amber-500/40 bg-amber-950/30 text-amber-300",
      dot: "bg-amber-400",
      pulse: "bg-amber-400/75",
    },
    zinc: {
      container: "border-zinc-800 bg-zinc-900/60 text-zinc-400",
      dot: "bg-zinc-400",
      pulse: "bg-zinc-400/75",
    },
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono uppercase tracking-wider select-none",
        variantStyles.container,
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulsing && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                variantStyles.pulse
              )}
            />
          )}
          <span
            className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", variantStyles.dot)}
          />
        </span>
      )}
      {children}
    </span>
  );
}
