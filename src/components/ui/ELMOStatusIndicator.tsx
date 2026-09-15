"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

export interface ELMOStatusIndicatorProps {
  state?: VoiceState | "ONLINE" | "OFFLINE" | "READY";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ELMOStatusIndicator({
  state = "READY",
  size = "md",
  showLabel = true,
  className,
}: ELMOStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (state) {
      case "ONLINE":
      case "READY":
        return {
          label: "READY",
          dotColor: "bg-cyan-400",
          glowColor: "shadow-[0_0_12px_rgba(0,210,255,0.7)]",
          textColor: "text-cyan-400",
          pulse: true,
        };
      case "STANDBY":
        return {
          label: "STANDBY",
          dotColor: "bg-zinc-400",
          glowColor: "shadow-[0_0_8px_rgba(161,161,170,0.5)]",
          textColor: "text-zinc-400",
          pulse: false,
        };
      case "LISTENING":
        return {
          label: "LISTENING",
          dotColor: "bg-cyan-300",
          glowColor: "shadow-[0_0_15px_rgba(0,210,255,0.9)]",
          textColor: "text-cyan-300",
          pulse: true,
        };
      case "USER_SPEAKING":
        return {
          label: "USER SPEAKING",
          dotColor: "bg-blue-400",
          glowColor: "shadow-[0_0_15px_rgba(0,132,255,0.9)]",
          textColor: "text-blue-400",
          pulse: true,
        };
      case "PROCESSING":
        return {
          label: "PROCESSING",
          dotColor: "bg-cyan-400",
          glowColor: "shadow-[0_0_14px_rgba(0,229,255,0.8)]",
          textColor: "text-cyan-400",
          pulse: true,
        };
      case "ELMO_SPEAKING":
        return {
          label: "ELMO SPEAKING",
          dotColor: "bg-cyan-300",
          glowColor: "shadow-[0_0_18px_rgba(0,210,255,1)]",
          textColor: "text-cyan-300",
          pulse: true,
        };
      case "INTERRUPTED":
        return {
          label: "INTERRUPTED",
          dotColor: "bg-amber-400",
          glowColor: "shadow-[0_0_15px_rgba(251,191,36,0.8)]",
          textColor: "text-amber-400",
          pulse: true,
        };
      case "EXECUTING":
        return {
          label: "EXECUTING",
          dotColor: "bg-emerald-400",
          glowColor: "shadow-[0_0_16px_rgba(16,185,129,0.9)]",
          textColor: "text-emerald-400",
          pulse: true,
        };
      case "ERROR":
        return {
          label: "ALERT",
          dotColor: "bg-rose-500",
          glowColor: "shadow-[0_0_15px_rgba(244,63,94,0.9)]",
          textColor: "text-rose-400",
          pulse: true,
        };
      case "OFFLINE":
      default:
        return {
          label: "OFFLINE",
          dotColor: "bg-zinc-600",
          glowColor: "shadow-none",
          textColor: "text-zinc-500",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }[size];

  const textSize = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-2 font-mono select-none", className)}>
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              config.dotColor
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full transition-all duration-300",
            dotSize,
            config.dotColor,
            config.glowColor
          )}
        />
      </span>
      {showLabel && (
        <span className={cn("font-bold tracking-wider uppercase", textSize, config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
