"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface PixelProgressBarProps {
  value: number; // 0 - 100
  totalBlocks?: number; // default 20 blocks
  color?: "blue" | "cyan" | "green" | "amber" | "rose";
  showValue?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PixelProgressBar({
  value,
  totalBlocks = 20,
  color = "blue",
  showValue = true,
  label,
  size = "md",
  className,
}: PixelProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const filledBlocks = Math.round((clampedValue / 100) * totalBlocks);

  const colorStyles = {
    blue: {
      active: "bg-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.75)]",
      text: "text-cyan-300",
      inactive: "bg-[#0F1B2E]",
    },
    cyan: {
      active: "bg-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.75)]",
      text: "text-cyan-400",
      inactive: "bg-[#0F1B2E]",
    },
    green: {
      active: "bg-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.75)]",
      text: "text-cyan-300",
      inactive: "bg-[#0F1B2E]",
    },
    amber: {
      active: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
      text: "text-amber-400",
      inactive: "bg-[#0F1B2E]",
    },
    rose: {
      active: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
      text: "text-rose-400",
      inactive: "bg-[#0F1B2E]",
    },
  }[color];

  const blockHeight = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }[size];

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-mono">
          {label && <span className="text-zinc-400">{label}</span>}
          {showValue && (
            <span className={cn("font-bold tracking-wider ml-auto", colorStyles.text)}>
              {clampedValue}%
            </span>
          )}
        </div>
      )}

      {/* Segmented Pixel Blocks */}
      <div
        className="flex items-center gap-1 p-1 bg-[#050A14] border border-[#14233C] rounded-md"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress bar"}
      >
        {Array.from({ length: totalBlocks }).map((_, i) => {
          const isFilled = i < filledBlocks;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-[1px] transition-all duration-300",
                blockHeight,
                isFilled ? colorStyles.active : colorStyles.inactive
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
