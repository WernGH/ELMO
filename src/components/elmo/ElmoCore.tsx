"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { ElmoInnerCore } from "./ElmoInnerCore";
import { ElmoNeuralStructure } from "./ElmoNeuralStructure";
import { ElmoOuterShell } from "./ElmoOuterShell";
import { ElmoOrbitalRings } from "./ElmoOrbitalRings";
import { ElmoParticles } from "./ElmoParticles";
import { cn } from "@/lib/utils";

export interface ElmoCoreProps {
  voiceState?: VoiceState;
  audioLevel?: number; // Normalized 0.0 to 1.0 from microphone or TTS RMS
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
  interactive?: boolean;
  onStateChange?: (newState: VoiceState) => void;
  // Future Phase 4 Workforce extensibility anchor (dormant socket indicators)
  enableWorkforceSockets?: boolean;
}

export const CORE_STATE_METADATA: Record<
  VoiceState,
  {
    label: string;
    subtext: string;
    glowColor: string;
    statusBadge: string;
  }
> = {
  STANDBY: {
    label: "STANDBY",
    subtext: "ELMO is present but idle",
    glowColor: "rgba(0, 132, 255, 0.15)",
    statusBadge: "bg-blue-950/40 text-blue-300 border-blue-800/40",
  },
  LISTENING: {
    label: "LISTENING",
    subtext: "Actively listening to speech stream",
    glowColor: "rgba(0, 210, 255, 0.35)",
    statusBadge: "bg-cyan-950/50 text-cyan-300 border-cyan-500/50",
  },
  USER_SPEAKING: {
    label: "USER SPEAKING",
    subtext: "Receiving executive instruction",
    glowColor: "rgba(0, 180, 255, 0.45)",
    statusBadge: "bg-blue-900/50 text-cyan-200 border-blue-400/50",
  },
  PROCESSING: {
    label: "PROCESSING",
    subtext: "Synthesizing executive intelligence via Gemini",
    glowColor: "rgba(0, 229, 255, 0.5)",
    statusBadge: "bg-cyan-950/60 text-cyan-200 border-cyan-400/60",
  },
  ELMO_SPEAKING: {
    label: "SPEAKING",
    subtext: "Delivering executive response",
    glowColor: "rgba(0, 210, 255, 0.45)",
    statusBadge: "bg-cyan-900/50 text-white border-cyan-400/60",
  },
  INTERRUPTED: {
    label: "INTERRUPTED",
    subtext: "Barge-in signal detected",
    glowColor: "rgba(255, 255, 255, 0.5)",
    statusBadge: "bg-zinc-800/60 text-white border-zinc-500/60",
  },
  RECONNECTING: {
    label: "RECONNECTING",
    subtext: "Restoring realtime voice channel",
    glowColor: "rgba(245, 158, 11, 0.35)",
    statusBadge: "bg-amber-950/40 text-amber-300 border-amber-500/40",
  },
  EXECUTING: {
    label: "EXECUTING",
    subtext: "Executing SaaS operational action",
    glowColor: "rgba(16, 185, 129, 0.55)",
    statusBadge: "bg-emerald-950/60 text-emerald-300 border-emerald-500/50",
  },
  ERROR: {
    label: "ALERT",
    subtext: "Voice engine error — text fallback active",
    glowColor: "rgba(244, 63, 94, 0.35)",
    statusBadge: "bg-rose-950/40 text-rose-300 border-rose-500/40",
  },
};

export function ElmoCore({
  voiceState = "STANDBY",
  audioLevel = 0,
  size = "md",
  className,
  interactive = false,
  onStateChange,
  enableWorkforceSockets = false,
}: ElmoCoreProps) {
  const metadata = CORE_STATE_METADATA[voiceState] || CORE_STATE_METADATA.STANDBY;

  // Size dimensions mapping
  const sizeClasses = {
    sm: "w-32 h-32 sm:w-36 sm:h-36",
    md: "w-48 h-48 sm:w-56 sm:h-56",
    lg: "w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96",
    full: "w-72 h-72 sm:w-88 sm:h-88 md:w-[420px] md:h-[420px] lg:w-[480px] lg:h-[480px] max-h-[58vh]",
  };

  const handleCoreClick = () => {
    if (!interactive || !onStateChange) return;
    const states: VoiceState[] = [
      "STANDBY",
      "LISTENING",
      "USER_SPEAKING",
      "PROCESSING",
      "ELMO_SPEAKING",
    ];
    const currentIndex = states.indexOf(voiceState);
    const nextIndex = (currentIndex + 1) % states.length;
    onStateChange(states[nextIndex]);
  };

  return (
    <div
      role="img"
      aria-label={`ELMO Floating AI Core in state ${metadata.label}: ${metadata.subtext}`}
      onClick={handleCoreClick}
      data-testid="elmo-floating-ai-core"
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-700",
        sizeClasses[size],
        interactive && "cursor-pointer hover:brightness-110 active:scale-95",
        className
      )}
    >
      {/* 1. Controlled Ambient Luminescence Field behind Core */}
      <div
        className="absolute inset-0 rounded-full blur-[48px] pointer-events-none transition-all duration-1000"
        style={{
          backgroundColor: metadata.glowColor,
          transform: `scale(${1 + audioLevel * 0.3})`,
        }}
      />

      {/* 2. Layer 5: Subtle Orbiting Particles */}
      <ElmoParticles voiceState={voiceState} size={size} />

      {/* 3. Layer 4: Multi-Inclined Holographic Orbital Rings */}
      <ElmoOrbitalRings voiceState={voiceState} size={size} />

      {/* 4. Layer 3: Subtle Holographic Outer Shell with Telemetry */}
      <ElmoOuterShell voiceState={voiceState} size={size} />

      {/* 5. Layer 2: Interconnected Synaptic Neural Structure */}
      <ElmoNeuralStructure voiceState={voiceState} size={size} />

      {/* 6. Layer 1: Concentrated High-Energy Inner Core */}
      <ElmoInnerCore
        voiceState={voiceState}
        audioLevel={audioLevel}
        size={size}
      />

      {/* 7. Future Phase 4 AI Workforce Extensibility Anchors (Dormant Node Sockets) */}
      {enableWorkforceSockets && size !== "sm" && (
        <div className="absolute inset-0 pointer-events-none" data-testid="workforce-sockets-anchor">
          {/* Top (Research / Ops), Right (Sales), Bottom (Content), Left (Marketing) */}
          {[
            { pos: "top-2 left-1/2 -translate-x-1/2", label: "NODE-1" },
            { pos: "bottom-2 left-1/2 -translate-x-1/2", label: "NODE-2" },
            { pos: "left-2 top-1/2 -translate-y-1/2", label: "NODE-3" },
            { pos: "right-2 top-1/2 -translate-y-1/2", label: "NODE-4" },
          ].map((socket, idx) => (
            <div
              key={`socket-${idx}`}
              className={cn(
                "absolute flex items-center justify-center w-3 h-3 rounded-full border border-cyan-500/30 bg-[#040A17]/80 opacity-40 hover:opacity-100 transition-opacity",
                socket.pos
              )}
              title="Autonomous Specialist Node Docking Socket (Phase 4 Extensible)"
            >
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
