"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ELMORobotBust } from "./ELMORobotBust";

export type ELMORobotState =
  | "IDLE"
  | "STANDBY"
  | "LISTENING"
  | "USER_SPEAKING"
  | "THINKING"
  | "PROCESSING"
  | "WORKING"
  | "SPEAKING"
  | "ELMO_SPEAKING"
  | "INTERRUPTED"
  | "RECONNECTING"
  | "EXECUTING"
  | "SUCCESS"
  | "WARNING"
  | "NEEDS_APPROVAL"
  | "ERROR";

export interface ELMORobotProps {
  state?: ELMORobotState;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showBadge?: boolean;
  interactive?: boolean;
  className?: string;
  onStateChange?: (newState: ELMORobotState) => void;
}

export const STATE_METADATA: Record<
  ELMORobotState,
  {
    label: string;
    subtext: string;
    color: string;
    border: string;
    bg: string;
    glow: string;
    symbol: string;
  }
> = {
  IDLE: {
    label: "ONLINE",
    subtext: "Ready to work",
    color: "text-elmo-neonGreen",
    border: "border-cyan-500/40",
    bg: "bg-cyan-950/20",
    glow: "shadow-[0_0_25px_rgba(0,210,255,0.35)]",
    symbol: "●",
  },
  STANDBY: {
    label: "STANDBY",
    subtext: "Voice engine ready",
    color: "text-zinc-300",
    border: "border-blue-900/60",
    bg: "bg-blue-950/30",
    glow: "shadow-[0_0_20px_rgba(0,132,255,0.2)]",
    symbol: "●",
  },
  LISTENING: {
    label: "LISTENING",
    subtext: "Awaiting superior directives",
    color: "text-cyan-300",
    border: "border-cyan-400/50",
    bg: "bg-cyan-950/30",
    glow: "shadow-[0_0_30px_rgba(0,210,255,0.45)]",
    symbol: "◉",
  },
  USER_SPEAKING: {
    label: "USER SPEAKING",
    subtext: "Capturing superior speech stream",
    color: "text-blue-300",
    border: "border-blue-400/50",
    bg: "bg-blue-950/30",
    glow: "shadow-[0_0_30px_rgba(0,132,255,0.45)]",
    symbol: "◉",
  },
  THINKING: {
    label: "PROCESSING",
    subtext: "Synthesizing executive plan",
    color: "text-cyan-400",
    border: "border-cyan-500/40",
    bg: "bg-cyan-950/30",
    glow: "shadow-[0_0_25px_rgba(0,229,255,0.4)]",
    symbol: "◉",
  },
  PROCESSING: {
    label: "PROCESSING",
    subtext: "Cognitive synthesis in progress",
    color: "text-cyan-300",
    border: "border-cyan-400/50",
    bg: "bg-cyan-950/30",
    glow: "shadow-[0_0_30px_rgba(0,210,255,0.45)]",
    symbol: "◉",
  },
  WORKING: {
    label: "WORKING",
    subtext: "Orchestrating workforce tasks",
    color: "text-blue-300",
    border: "border-blue-400/40",
    bg: "bg-blue-950/30",
    glow: "shadow-[0_0_25px_rgba(0,132,255,0.35)]",
    symbol: "◉",
  },
  SPEAKING: {
    label: "TRANSMITTING",
    subtext: "Delivering executive briefing",
    color: "text-cyan-300",
    border: "border-cyan-400/40",
    bg: "bg-cyan-950/30",
    glow: "shadow-[0_0_25px_rgba(0,210,255,0.4)]",
    symbol: "◉",
  },
  ELMO_SPEAKING: {
    label: "ELMO SPEAKING",
    subtext: "Delivering executive briefing aloud",
    color: "text-cyan-300",
    border: "border-cyan-400/60",
    bg: "bg-cyan-950/40",
    glow: "shadow-[0_0_30px_rgba(0,210,255,0.5)]",
    symbol: "◉",
  },
  INTERRUPTED: {
    label: "INTERRUPTED",
    subtext: "Barge-in signal detected",
    color: "text-cyan-200",
    border: "border-cyan-400/60",
    bg: "bg-cyan-950/50",
    glow: "shadow-[0_0_25px_rgba(0,210,255,0.5)]",
    symbol: "⚡",
  },
  RECONNECTING: {
    label: "RECONNECTING",
    subtext: "Re-establishing neural link",
    color: "text-amber-300",
    border: "border-amber-400/60",
    bg: "bg-amber-950/40",
    glow: "shadow-[0_0_25px_rgba(245,158,11,0.45)]",
    symbol: "↻",
  },
  EXECUTING: {
    label: "EXECUTING",
    subtext: "Performing funnel operation",
    color: "text-emerald-400",
    border: "border-emerald-400/60",
    bg: "bg-emerald-950/40",
    glow: "shadow-[0_0_35px_rgba(16,185,129,0.5)]",
    symbol: "⚡",
  },
  SUCCESS: {
    label: "COMPLETED",
    subtext: "Directive verified",
    color: "text-cyan-300",
    border: "border-cyan-400/40",
    bg: "bg-cyan-950/30",
    glow: "shadow-[0_0_25px_rgba(0,210,255,0.4)]",
    symbol: "✔",
  },
  WARNING: {
    label: "WARNING",
    subtext: "Anomaly detected in pipeline",
    color: "text-amber-400",
    border: "border-amber-500/40",
    bg: "bg-amber-950/30",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    symbol: "⚠",
  },
  NEEDS_APPROVAL: {
    label: "APPROVAL REQUIRED",
    subtext: "Awaiting human authorization",
    color: "text-cyan-300",
    border: "border-cyan-400/50",
    bg: "bg-cyan-950/40",
    glow: "shadow-[0_0_25px_rgba(0,210,255,0.45)]",
    symbol: "⚠",
  },
  ERROR: {
    label: "ALERT",
    subtext: "Execution halted",
    color: "text-rose-400",
    border: "border-rose-500/40",
    bg: "bg-rose-950/30",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    symbol: "✖",
  },
};

export function ELMORobot({
  state = "IDLE",
  size = "md",
  showBadge = true,
  interactive = false,
  className,
  onStateChange,
}: ELMORobotProps) {
  const [internalState, setInternalState] = useState<ELMORobotState>(state);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    setInternalState(state);
  }, [state]);

  // Subtle natural eye blink cycle (every 4-6 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const meta = STATE_METADATA[internalState] || STATE_METADATA.IDLE;

  const sizeClasses = {
    sm: { container: "w-12 h-12", svg: "w-10 h-10", badgeText: "text-[9px]" },
    md: { container: "w-24 h-24", svg: "w-20 h-20", badgeText: "text-[11px]" },
    lg: { container: "w-40 h-40", svg: "w-36 h-36", badgeText: "text-xs" },
    xl: { container: "w-52 h-52", svg: "w-48 h-48", badgeText: "text-sm" },
    "2xl": { container: "w-64 h-64 sm:w-72 sm:h-72", svg: "w-56 h-56 sm:w-64 sm:h-64", badgeText: "text-sm" },
  }[size];

  const handleClick = () => {
    if (!interactive) return;
    const states: ELMORobotState[] = [
      "IDLE",
      "STANDBY",
      "LISTENING",
      "USER_SPEAKING",
      "PROCESSING",
      "ELMO_SPEAKING",
      "INTERRUPTED",
      "SUCCESS",
      "WARNING",
      "NEEDS_APPROVAL",
      "ERROR",
    ];
    const nextIdx = (states.indexOf(internalState) + 1) % states.length;
    const nextState = states[nextIdx];
    setInternalState(nextState);
    if (onStateChange) onStateChange(nextState);
  };

  const isRedState = internalState === "ERROR";
  const isAmberState = internalState === "WARNING";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none",
        interactive && "cursor-pointer group",
        className
      )}
      onClick={handleClick}
      role={interactive ? "button" : "img"}
      aria-label={`ELMO Robot in state ${internalState}`}
      title={interactive ? "Click to cycle ELMO visual states" : `ELMO (${meta.label})`}
    >
      {/* Floating AI Core */}
      <ELMORobotBust
        state={internalState}
        size={size}
        interactive={false}
      />

      {/* Digital Status Badge */}
      {showBadge && (
        <div className="mt-3 flex flex-col items-center gap-0.5 text-center">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono uppercase tracking-wider backdrop-blur-md",
              sizeClasses.badgeText,
              meta.color,
              meta.border,
              meta.bg
            )}
          >
            <span className="text-[9px]">{meta.symbol}</span>
            <span className="font-bold">ELMO: {meta.label}</span>
          </div>

          <p className="text-[11px] text-zinc-400 font-sans tracking-normal mt-0.5">
            {meta.subtext}
          </p>
        </div>
      )}
    </div>
  );
}
