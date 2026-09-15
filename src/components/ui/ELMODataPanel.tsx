"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ELMODataPanelProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glow" | "subtle";
}

export function ELMODataPanel({
  title,
  subtitle,
  badge,
  icon,
  headerAction,
  children,
  className,
  variant = "default",
}: ELMODataPanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-[#060D1A]/85 border border-[#14233D] backdrop-blur-xl p-4 transition-all duration-300",
        variant === "glow" && "border-cyan-500/35 shadow-[0_0_25px_rgba(0,210,255,0.15)]",
        variant === "subtle" && "bg-[#040812]/70 border-[#0E1B30]",
        className
      )}
    >
      {(title || subtitle || icon || headerAction) && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#14233D]">
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-cyan-400">{icon}</div>}
            <div>
              {title && (
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    {title}
                  </h3>
                  {badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {badge}
                    </span>
                  )}
                </div>
              )}
              {subtitle && <p className="text-[10px] text-zinc-400 font-sans">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {children}
    </div>
  );
}
