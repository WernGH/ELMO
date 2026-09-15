"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

export interface ElmoOuterShellProps {
  voiceState: VoiceState;
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

export function ElmoOuterShell({
  voiceState,
  size = "md",
  className,
}: ElmoOuterShellProps) {
  const isListening = voiceState === "LISTENING";
  const isProcessing = voiceState === "PROCESSING";
  const isSpeaking = voiceState === "ELMO_SPEAKING";
  const isInterrupted = voiceState === "INTERRUPTED";

  const radiusMap = {
    sm: 44,
    md: 76,
    lg: 114,
    full: 152,
  };
  const R = radiusMap[size] || 76;

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none select-none",
        className
      )}
      data-testid="elmo-outer-shell"
    >
      <svg
        viewBox="-180 -180 360 360"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="shellRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0066FF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="segmentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0044AA" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 1. Counter-Rotating Primary Geodesic Ring */}
        <g className="animate-spin [animation-duration:50s] motion-reduce:animate-none">
          <circle
            cx="0"
            cy="0"
            r={R}
            fill="none"
            stroke="url(#shellRingGrad)"
            strokeWidth="1.2"
            strokeDasharray="8 6 2 6"
            opacity={isListening || isSpeaking ? "0.9" : "0.6"}
            className="transition-opacity duration-500"
          />

          {/* Precision Cardinal Micro-Ticks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={`tick-${deg}`}
              x1={R - 3}
              y1="0"
              x2={R + 3}
              y2="0"
              stroke="#00D2FF"
              strokeWidth="1.2"
              opacity="0.8"
              transform={`rotate(${deg})`}
            />
          ))}
        </g>

        {/* 2. Clockwise Secondary Data Horizon Ring */}
        <g className="animate-spin [animation-duration:35s] [animation-direction:reverse] motion-reduce:animate-none">
          <circle
            cx="0"
            cy="0"
            r={R * 1.08}
            fill="none"
            stroke="#0084FF"
            strokeWidth="0.8"
            strokeDasharray="24 12 6 12"
            opacity={isProcessing ? "0.9" : "0.5"}
          />

          {/* Segmented Quadrant Arcs */}
          <path
            d={`M 0 -${R * 1.08} A ${R * 1.08} ${R * 1.08} 0 0 1 ${R * 0.76} -${R * 0.76}`}
            fill="none"
            stroke="url(#segmentGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity={isProcessing ? "1" : "0.6"}
          />
          <path
            d={`M 0 ${R * 1.08} A ${R * 1.08} ${R * 1.08} 0 0 1 -${R * 0.76} ${R * 0.76}`}
            fill="none"
            stroke="url(#segmentGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity={isProcessing ? "1" : "0.6"}
          />
        </g>

        {/* 3. Subtle Hexagonal / Geometric Wireframe Layer */}
        {size !== "sm" && (
          <polygon
            points={`
              0,-${R * 0.9}
              ${R * 0.78},-${R * 0.45}
              ${R * 0.78},${R * 0.45}
              0,${R * 0.9}
              -${R * 0.78},${R * 0.45}
              -${R * 0.78},-${R * 0.45}
            `}
            fill="none"
            stroke="#00D2FF"
            strokeWidth="0.6"
            strokeDasharray="3 4"
            opacity={isProcessing ? "0.65" : "0.3"}
            className="animate-spin [animation-duration:90s] motion-reduce:animate-none"
          />
        )}

        {/* 4. Instant Interruption Shockwave Ripple */}
        {isInterrupted && (
          <circle
            cx="0"
            cy="0"
            r={R * 1.25}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            className="animate-ping [animation-duration:0.6s]"
          />
        )}
      </svg>
    </div>
  );
}
