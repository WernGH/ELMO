"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtext?: string;
  icon?: LucideIcon;
  accentColor?: "blue" | "electric" | "cyan" | "green" | "amber" | "rose" | "red";
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  changeType = "positive",
  subtext,
  icon: Icon,
  accentColor = "blue",
  className,
}: MetricCardProps) {
  const accentStyles = {
    blue: {
      border: "border-cyan-500/30 hover:border-cyan-400/60",
      glow: "hover:shadow-[0_0_25px_rgba(0,210,255,0.25)]",
      iconBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      valueColor: "text-white",
      accentBar: "bg-gradient-to-r from-blue-500 to-cyan-400",
    },
    electric: {
      border: "border-blue-500/30 hover:border-blue-400/60",
      glow: "hover:shadow-[0_0_25px_rgba(0,132,255,0.25)]",
      iconBg: "bg-blue-500/10 text-blue-300 border-blue-500/30",
      valueColor: "text-white",
      accentBar: "bg-blue-500",
    },
    cyan: {
      border: "border-cyan-400/30 hover:border-cyan-300/60",
      glow: "hover:shadow-[0_0_25px_rgba(0,229,255,0.25)]",
      iconBg: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
      valueColor: "text-white",
      accentBar: "bg-cyan-400",
    },
    green: {
      border: "border-cyan-500/30 hover:border-cyan-400/60",
      glow: "hover:shadow-[0_0_20px_rgba(0,210,255,0.2)]",
      iconBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      valueColor: "text-white",
      accentBar: "bg-cyan-400",
    },
    red: {
      border: "border-rose-500/30 hover:border-rose-500/60",
      glow: "hover:shadow-[0_0_25px_rgba(244,63,94,0.25)]",
      iconBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      valueColor: "text-white",
      accentBar: "bg-rose-500",
    },
    amber: {
      border: "border-amber-500/30 hover:border-amber-500/60",
      glow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
      iconBg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      valueColor: "text-white",
      accentBar: "bg-amber-400",
    },
    rose: {
      border: "border-rose-500/30 hover:border-rose-500/60",
      glow: "hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]",
      iconBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      valueColor: "text-white",
      accentBar: "bg-rose-500",
    },
  }[accentColor];

  const changeColor = {
    positive: "text-cyan-300",
    negative: "text-rose-400",
    neutral: "text-zinc-400",
  }[changeType];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-[#070D18]/90 backdrop-blur-xl border p-4 sm:p-5 transition-all duration-300 group",
        accentStyles.border,
        accentStyles.glow,
        className
      )}
    >
      {/* Top Cyber Accent Line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100",
          accentStyles.accentBar
        )}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
                accentStyles.valueColor
              )}
            >
              {value}
            </span>
            {change && (
              <span className={cn("text-xs font-mono font-medium", changeColor)}>
                {change}
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-xs text-zinc-500 font-sans">{subtext}</p>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg border transition-transform duration-300 group-hover:scale-110",
              accentStyles.iconBg
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
