"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface AIPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  badge?: React.ReactNode;
  glow?: boolean;
  glowColor?: "blue" | "green" | "cyan" | "amber" | "rose" | "red" | "none";
  corners?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export function AIPanel({
  title,
  subtitle,
  headerAction,
  badge,
  glow = false,
  glowColor = "blue",
  corners = true,
  children,
  className,
  headerClassName,
  bodyClassName,
  ...props
}: AIPanelProps) {
  const glowStyles = {
    blue: "border-cyan-500/35 shadow-[0_0_25px_rgba(0,210,255,0.2)]",
    cyan: "border-cyan-400/35 shadow-[0_0_25px_rgba(0,229,255,0.2)]",
    green: "border-cyan-500/30 shadow-[0_0_20px_rgba(0,210,255,0.15)]",
    red: "border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.2)]",
    amber: "border-amber-500/35 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    rose: "border-rose-500/35 shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    none: "border-[#14233A]",
  }[glow ? glowColor : "none"];

  return (
    <div
      className={cn(
        "relative rounded-xl bg-[#070D18]/90 backdrop-blur-xl border transition-all duration-300",
        glowStyles,
        className
      )}
      {...props}
    >
      {/* Optional Cyber Corner Accents in Neon Cyan */}
      {corners && (
        <>
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/60 rounded-br-sm pointer-events-none" />
        </>
      )}

      {/* Header */}
      {(title || headerAction || badge) && (
        <div
          className={cn(
            "flex items-center justify-between border-b border-[#14233A]/80 px-4 py-3 sm:px-5 sm:py-3.5",
            headerClassName
          )}
        >
          <div className="flex items-center gap-2.5">
            {badge}
            <div>
              {title && (
                <h3 className="text-sm font-semibold tracking-wide text-zinc-100 font-sans flex items-center gap-2">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] text-zinc-400 font-mono tracking-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {headerAction && (
            <div className="flex items-center gap-2">{headerAction}</div>
          )}
        </div>
      )}

      {/* Body Content */}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
