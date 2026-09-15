"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

export interface ElmoInnerCoreProps {
  voiceState: VoiceState;
  audioLevel?: number; // Normalized 0.0 to 1.0
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

export function ElmoInnerCore({
  voiceState,
  audioLevel = 0,
  size = "md",
  className,
}: ElmoInnerCoreProps) {
  const isSpeaking = voiceState === "ELMO_SPEAKING";
  const isUserSpeaking = voiceState === "USER_SPEAKING";
  const isListening = voiceState === "LISTENING";
  const isProcessing = voiceState === "PROCESSING";
  const isInterrupted = voiceState === "INTERRUPTED";
  const isReconnecting = voiceState === "RECONNECTING";
  const isError = voiceState === "ERROR";

  // Dynamic scale & brightness based on state and audio level
  const audioScale = Math.min(1.35, 1 + audioLevel * 0.45);
  const audioGlow = Math.min(45, 15 + audioLevel * 35);

  const radiusMap = {
    sm: 28,
    md: 48,
    lg: 72,
    full: 96,
  };
  const baseR = radiusMap[size] || 48;

  return (
    <div
      className={cn("relative flex items-center justify-center pointer-events-none select-none", className)}
      style={{
        transform: `scale(${isSpeaking || isUserSpeaking ? audioScale : 1})`,
        transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      data-testid="elmo-inner-core"
    >
      <svg
        viewBox="-120 -120 240 240"
        className={cn(
          "w-full h-full overflow-visible",
          size === "sm" ? "max-w-[100px] max-h-[100px]" :
          size === "md" ? "max-w-[160px] max-h-[160px]" :
          size === "lg" ? "max-w-[240px] max-h-[240px]" : "max-w-[320px] max-h-[320px]"
        )}
      >
        <defs>
          {/* Radial Core Energy Gradients */}
          <radialGradient id="innerCoreGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="25%" stopColor="#80E5FF" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#00D2FF" stopOpacity="0.8" />
            <stop offset="85%" stopColor="#0066FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#002266" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="denseCenterGradient" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="40%" stopColor="#B3F0FF" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#00B8FF" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0044AA" stopOpacity="0.1" />
          </radialGradient>

          {/* Deep Ambient Aura Filter */}
          <filter id="coreAuraFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={audioGlow / 3} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Outermost Ambient Luminescence Field */}
        <circle
          cx="0"
          cy="0"
          r={baseR * 1.5}
          fill="url(#innerCoreGradient)"
          opacity={
            isProcessing ? 0.85 :
            isSpeaking ? 0.8 :
            isListening ? 0.65 :
            isReconnecting ? 0.5 :
            isError ? 0.3 : 0.45
          }
          className={cn(
            "transition-opacity duration-500",
            isProcessing && "animate-pulse"
          )}
          filter="url(#coreAuraFilter)"
        />

        {/* 2. Concentrated Dense Core Sphere */}
        <circle
          cx="0"
          cy="0"
          r={baseR}
          fill="url(#denseCenterGradient)"
          className={cn(
            "transition-all duration-300",
            isSpeaking ? "animate-pulse" :
            isProcessing ? "animate-spin [animation-duration:8s]" : ""
          )}
          style={{
            filter: `drop-shadow(0 0 ${audioGlow}px ${
              isError ? "#F43F5E" :
              isReconnecting ? "#F59E0B" :
              isInterrupted ? "#FFFFFF" :
              "#00D2FF"
            })`,
          }}
        />

        {/* 3. Singularity / High-Density Energy Nucleus */}
        <circle
          cx="0"
          cy="0"
          r={baseR * 0.38}
          fill="#FFFFFF"
          opacity={isProcessing ? 0.95 : 0.85}
          className={cn(
            "transition-transform duration-200",
            isSpeaking && "scale-110",
            isProcessing && "animate-ping [animation-duration:3s]"
          )}
          style={{
            filter: "drop-shadow(0 0 12px #FFFFFF)",
          }}
        />

        {/* 4. Fine Internal Equatorial Horizon Ring */}
        <ellipse
          cx="0"
          cy="0"
          rx={baseR * 0.95}
          ry={baseR * 0.3}
          fill="none"
          stroke="#00D2FF"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          opacity="0.75"
          className="animate-spin [animation-duration:20s] motion-reduce:animate-none"
        />
      </svg>
    </div>
  );
}
