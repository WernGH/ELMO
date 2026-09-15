"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { CORE_STATE_METADATA } from "@/components/elmo";
import { cn } from "@/lib/utils";

export interface ELMOVoiceStatusProps {
  voiceState: VoiceState;
  isPaused?: boolean;
  className?: string;
}

export function ELMOVoiceStatus({
  voiceState,
  isPaused = false,
  className,
}: ELMOVoiceStatusProps) {
  const meta = CORE_STATE_METADATA[voiceState] || CORE_STATE_METADATA.STANDBY;

  const getGuidanceText = () => {
    if (isPaused) return "VOICE ENGINE PAUSED // CLICK RESUME TO CONTINUE";
    switch (voiceState) {
      case "LISTENING":
        return "LISTENING // SPEAK FREELY (NO WAKE WORD NEEDED)";
      case "USER_SPEAKING":
        return "VOICE DETECTED // STREAMING DIRECTIVE";
      case "PROCESSING":
        return "SYNTHESIZING INTELLIGENCE MODEL RESPONSE";
      case "ELMO_SPEAKING":
        return "TRANSMITTING BRIEFING // SPEAK TO INTERRUPT AT ANY TIME";
      case "INTERRUPTED":
        return "YIELDING IMMEDIATELY TO YOUR DIRECTIVE";
      case "STANDBY":
        return "STANDBY // CLICK TO ACTIVATE HANDS-FREE VOICE";
      case "ERROR":
        return "SYSTEM ALERT // CHECK AUDIO PERMISSION OR RETRY";
      default:
        return "SYSTEM READY";
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-1.5 select-none", className)}>
      {/* State Pill Badge */}
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-300",
          meta.statusBadge || "bg-cyan-950/50 text-cyan-300 border-cyan-500/50"
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>{isPaused ? "PAUSED" : meta.label}</span>
      </div>

      {/* Guidance Subtitle Text */}
      <p className="text-[11px] font-mono text-zinc-400 tracking-wide text-center">
        {getGuidanceText()}
      </p>
    </div>
  );
}
