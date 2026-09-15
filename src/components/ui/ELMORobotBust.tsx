"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ElmoCore, CORE_STATE_METADATA } from "@/components/elmo";
import { VoiceState } from "@/services/voice/voice.types";

/**
 * ELMO Visual State Union (Normalized to Floating AI Core Canonical States)
 */
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

export interface ELMORobotBustProps {
  state?: ELMORobotState;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  audioLevel?: number; // Normalized 0 - 1
  interactive?: boolean;
  className?: string;
  onStateChange?: (newState: ELMORobotState) => void;
}

/**
 * State Metadata mapping for Floating AI Core
 */
export const ROBOT_BUST_STATES: Record<
  ELMORobotState,
  {
    label: string;
    subtext: string;
    color: string;
    glow: string;
    border: string;
    symbol: string;
  }
> = {
  IDLE: {
    label: "ONLINE",
    subtext: "Ready for directive",
    color: "text-cyan-400",
    glow: "shadow-[0_0_25px_rgba(0,210,255,0.3)]",
    border: "border-cyan-500/40",
    symbol: "●",
  },
  STANDBY: {
    label: "STANDBY",
    subtext: "Voice engine ready",
    color: "text-blue-300",
    glow: "shadow-[0_0_15px_rgba(0,132,255,0.2)]",
    border: "border-blue-900/40",
    symbol: "●",
  },
  LISTENING: {
    label: "LISTENING",
    subtext: "Awaiting your directive",
    color: "text-cyan-300",
    glow: "shadow-[0_0_30px_rgba(0,210,255,0.45)]",
    border: "border-cyan-400/50",
    symbol: "◉",
  },
  USER_SPEAKING: {
    label: "USER SPEAKING",
    subtext: "Capturing speech stream",
    color: "text-blue-300",
    glow: "shadow-[0_0_35px_rgba(0,132,255,0.5)]",
    border: "border-blue-400/60",
    symbol: "◉",
  },
  THINKING: {
    label: "PROCESSING",
    subtext: "Synthesizing executive intelligence",
    color: "text-cyan-400",
    glow: "shadow-[0_0_30px_rgba(0,229,255,0.4)]",
    border: "border-cyan-400/50",
    symbol: "⚙",
  },
  PROCESSING: {
    label: "PROCESSING",
    subtext: "Synthesizing executive response",
    color: "text-cyan-300",
    glow: "shadow-[0_0_30px_rgba(0,229,255,0.5)]",
    border: "border-cyan-300/50",
    symbol: "⚙",
  },
  WORKING: {
    label: "WORKING",
    subtext: "Workforce orchestration active",
    color: "text-cyan-300",
    glow: "shadow-[0_0_25px_rgba(0,210,255,0.35)]",
    border: "border-cyan-500/50",
    symbol: "◈",
  },
  SPEAKING: {
    label: "SPEAKING",
    subtext: "Delivering audio briefing",
    color: "text-cyan-300",
    glow: "shadow-[0_0_40px_rgba(0,210,255,0.55)]",
    border: "border-cyan-400/70",
    symbol: "≋",
  },
  ELMO_SPEAKING: {
    label: "SPEAKING",
    subtext: "Delivering audio briefing",
    color: "text-cyan-300",
    glow: "shadow-[0_0_40px_rgba(0,210,255,0.55)]",
    border: "border-cyan-400/70",
    symbol: "≋",
  },
  INTERRUPTED: {
    label: "INTERRUPTED",
    subtext: "Barge-in signal detected",
    color: "text-white",
    glow: "shadow-[0_0_25px_rgba(255,255,255,0.4)]",
    border: "border-zinc-400/60",
    symbol: "⚡",
  },
  RECONNECTING: {
    label: "RECONNECTING",
    subtext: "Restoring realtime voice channel",
    color: "text-amber-300",
    glow: "shadow-[0_0_25px_rgba(245,158,11,0.35)]",
    border: "border-amber-500/50",
    symbol: "↻",
  },
  EXECUTING: {
    label: "EXECUTING",
    subtext: "Performing funnel operation",
    color: "text-emerald-400",
    glow: "shadow-[0_0_35px_rgba(16,185,129,0.5)]",
    border: "border-emerald-400/60",
    symbol: "⚡",
  },
  SUCCESS: {
    label: "COMPLETED",
    subtext: "Directive verified and committed",
    color: "text-cyan-300",
    glow: "shadow-[0_0_30px_rgba(0,210,255,0.45)]",
    border: "border-cyan-500/50",
    symbol: "✔",
  },
  WARNING: {
    label: "WARNING",
    subtext: "Policy threshold exceeded",
    color: "text-amber-400",
    glow: "shadow-[0_0_25px_rgba(245,158,11,0.35)]",
    border: "border-amber-500/40",
    symbol: "⚠",
  },
  NEEDS_APPROVAL: {
    label: "APPROVAL REQUIRED",
    subtext: "Pending human authorization",
    color: "text-amber-300",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.4)]",
    border: "border-amber-400/50",
    symbol: "⚠",
  },
  ERROR: {
    label: "ALERT",
    subtext: "System fault detected",
    color: "text-rose-400",
    glow: "shadow-[0_0_35px_rgba(244,63,94,0.5)]",
    border: "border-rose-500/50",
    symbol: "✖",
  },
};

function mapRobotStateToVoiceState(state: ELMORobotState): VoiceState {
  switch (state) {
    case "IDLE":
    case "STANDBY":
    case "SUCCESS":
      return "STANDBY";
    case "LISTENING":
      return "LISTENING";
    case "USER_SPEAKING":
      return "USER_SPEAKING";
    case "THINKING":
    case "PROCESSING":
    case "WORKING":
      return "PROCESSING";
    case "EXECUTING":
      return "EXECUTING";
    case "SPEAKING":
    case "ELMO_SPEAKING":
      return "ELMO_SPEAKING";
    case "INTERRUPTED":
      return "INTERRUPTED";
    case "RECONNECTING":
      return "RECONNECTING";
    case "WARNING":
    case "NEEDS_APPROVAL":
    case "ERROR":
      return "ERROR";
    default:
      return "STANDBY";
  }
}

function mapSizeToCoreSize(size?: string): "sm" | "md" | "lg" | "full" {
  switch (size) {
    case "2xl":
    case "full":
      return "full";
    case "xl":
    case "lg":
      return "lg";
    case "md":
      return "md";
    case "sm":
    default:
      return "sm";
  }
}

/**
 * ELMORobotBust (Migrated to Floating AI Core Official Identity)
 * Renders the Floating AI Core with full state reactivity, zero humanoid robot body geometry.
 */
export function ELMORobotBust({
  state = "STANDBY",
  size = "md",
  audioLevel = 0,
  interactive = false,
  className,
  onStateChange,
}: ELMORobotBustProps) {
  const [internalState, setInternalState] = useState<ELMORobotState>(state);

  useEffect(() => {
    setInternalState(state);
  }, [state]);

  const voiceState = mapRobotStateToVoiceState(internalState);
  const coreSize = mapSizeToCoreSize(size);

  const handleClick = () => {
    if (!interactive) return;
    const states: ELMORobotState[] = [
      "STANDBY",
      "LISTENING",
      "USER_SPEAKING",
      "PROCESSING",
      "ELMO_SPEAKING",
      "INTERRUPTED",
      "ERROR",
    ];
    const currentIndex = states.indexOf(internalState);
    const nextState = states[(currentIndex + 1) % states.length];
    setInternalState(nextState);
    if (onStateChange) onStateChange(nextState);
  };

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      onClick={handleClick}
      role={interactive ? "button" : "img"}
      aria-label={`ELMO Floating AI Core in state ${internalState}`}
    >
      <ElmoCore
        voiceState={voiceState}
        size={coreSize}
        audioLevel={audioLevel}
        interactive={interactive}
        enableWorkforceSockets={true}
        onStateChange={(s) => {
          setInternalState(s as ELMORobotState);
          onStateChange?.(s as ELMORobotState);
        }}
      />
    </div>
  );
}
