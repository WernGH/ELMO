"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

export interface ElmoOrbitalRingsProps {
  voiceState: VoiceState;
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

export function ElmoOrbitalRings({
  voiceState,
  size = "md",
  className,
}: ElmoOrbitalRingsProps) {
  const isListening = voiceState === "LISTENING";
  const isProcessing = voiceState === "PROCESSING";
  const isSpeaking = voiceState === "ELMO_SPEAKING";

  const scaleMap = {
    sm: 58,
    md: 104,
    lg: 156,
    full: 208,
  };
  const R = scaleMap[size] || 104;

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none select-none",
        className
      )}
      data-testid="elmo-orbital-rings"
    >
      <svg
        viewBox="-240 -240 480 480"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="orbitalRing1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#0066FF" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#00D2FF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="orbitalRing2Grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00B8FF" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#003399" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* 1. Primary Inclined Orbital Ring (35 deg tilt) */}
        <g
          transform="rotate(-25)"
          className={cn(
            "transition-transform duration-700",
            isProcessing ? "animate-spin [animation-duration:14s] motion-reduce:animate-none" :
            isSpeaking ? "animate-spin [animation-duration:22s] motion-reduce:animate-none" :
            "animate-spin [animation-duration:40s] motion-reduce:animate-none"
          )}
        >
          <ellipse
            cx="0"
            cy="0"
            rx={R * 1.15}
            ry={R * 0.44}
            fill="none"
            stroke="url(#orbitalRing1Grad)"
            strokeWidth={isSpeaking ? "1.4" : "1"}
            opacity={isListening ? 0.95 : 0.7}
            strokeDasharray={isProcessing ? "12 8" : undefined}
          />

          {/* Micro-satellite data packet node orbiting on the ring */}
          <circle
            cx={R * 1.15}
            cy="0"
            r={size === "sm" ? 1.6 : 2.5}
            fill="#FFFFFF"
            style={{
              filter: "drop-shadow(0 0 6px #00D2FF)",
            }}
          />
        </g>

        {/* 2. Secondary Counter-Inclined Orbital Ring (-35 deg tilt) */}
        <g
          transform="rotate(35)"
          className={cn(
            "transition-transform duration-700",
            isProcessing ? "animate-spin [animation-duration:18s] [animation-direction:reverse] motion-reduce:animate-none" :
            isSpeaking ? "animate-spin [animation-duration:28s] [animation-direction:reverse] motion-reduce:animate-none" :
            "animate-spin [animation-duration:50s] [animation-direction:reverse] motion-reduce:animate-none"
          )}
        >
          <ellipse
            cx="0"
            cy="0"
            rx={R * 1.28}
            ry={R * 0.48}
            fill="none"
            stroke="url(#orbitalRing2Grad)"
            strokeWidth="0.9"
            strokeDasharray="16 8 4 8"
            opacity={isSpeaking ? 0.9 : 0.6}
          />

          {/* Opposing micro data beacon */}
          <circle
            cx={-(R * 1.28)}
            cy="0"
            r={size === "sm" ? 1.4 : 2.2}
            fill="#80E5FF"
            style={{
              filter: "drop-shadow(0 0 5px #0084FF)",
            }}
          />
        </g>

        {/* 3. Outer Equatorial Horizon Ring (Deep Gyroscope Ring) */}
        {size !== "sm" && (
          <g
            transform="rotate(80)"
            className="animate-spin [animation-duration:65s] motion-reduce:animate-none"
          >
            <ellipse
              cx="0"
              cy="0"
              rx={R * 1.42}
              ry={R * 0.35}
              fill="none"
              stroke="#0066FF"
              strokeWidth="0.6"
              strokeDasharray="4 6"
              opacity={isProcessing ? 0.6 : 0.35}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
