"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ELMORobotState, STATE_METADATA } from "./ELMORobot";

export interface ELMOStatusProps {
  state?: ELMORobotState;
  showRadar?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  prefix?: string;
}

export function ELMOStatus({
  state = "IDLE",
  showRadar = true,
  size = "md",
  className,
  prefix = "COAI // ELMO",
}: ELMOStatusProps) {
  const meta = STATE_METADATA[state] || STATE_METADATA.IDLE;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-2",
    lg: "text-sm px-3.5 py-1.5 gap-2.5",
  }[size];

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }[size];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-mono tracking-wider uppercase backdrop-blur-md transition-all duration-300",
        sizeClasses,
        meta.color,
        meta.border,
        meta.bg,
        meta.glow,
        className
      )}
      role="status"
      aria-label={`${prefix} status: ${meta.label}`}
    >
      {showRadar ? (
        <span className="relative flex items-center justify-center">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              state === "ERROR"
                ? "bg-rose-400"
                : state === "WARNING" || state === "NEEDS_APPROVAL"
                ? "bg-amber-400"
                : "bg-cyan-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full",
              dotSizes,
              state === "ERROR"
                ? "bg-rose-500"
                : state === "WARNING" || state === "NEEDS_APPROVAL"
                ? "bg-amber-400"
                : "bg-cyan-400"
            )}
          />
        </span>
      ) : (
        <span className="font-bold">{meta.symbol}</span>
      )}

      <span className="font-bold tracking-widest">
        {prefix ? `${prefix} : ${meta.label}` : meta.label}
      </span>
    </div>
  );
}
