"use client";

import React, { useMemo } from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

export interface ElmoParticlesProps {
  voiceState: VoiceState;
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

interface Particle {
  id: number;
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  durationSec: number;
  delaySec: number;
}

export function ElmoParticles({
  voiceState,
  size = "md",
  className,
}: ElmoParticlesProps) {
  const isListening = voiceState === "LISTENING";
  const isProcessing = voiceState === "PROCESSING";
  const isSpeaking = voiceState === "ELMO_SPEAKING";

  const count = size === "sm" ? 8 : size === "md" ? 14 : 20;
  const spread = size === "sm" ? 60 : size === "md" ? 110 : 160;

  // Deterministic particle generation
  const particles: Particle[] = useMemo(() => {
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (i * 0.45);
      const radius = spread * 0.65 + (i % 5) * (spread * 0.08);
      list.push({
        id: i,
        cx: Math.cos(angle) * radius,
        cy: Math.sin(angle) * radius,
        r: i % 4 === 0 ? 1.8 : 1.1,
        opacity: 0.35 + (i % 3) * 0.2,
        durationSec: 4 + (i % 4) * 2,
        delaySec: (i % 5) * 0.8,
      });
    }
    return list;
  }, [count, spread]);

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none select-none",
        className
      )}
      data-testid="elmo-particles"
    >
      <svg
        viewBox="-200 -200 400 400"
        className={cn(
          "w-full h-full overflow-visible transition-transform duration-700",
          isProcessing ? "scale-95 animate-spin [animation-duration:25s] motion-reduce:animate-none" :
          isListening ? "scale-90 motion-reduce:animate-none" :
          isSpeaking ? "scale-105 motion-reduce:animate-none" : ""
        )}
      >
        <defs>
          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {particles.map((p) => (
          <circle
            key={`particle-${p.id}`}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="#00D2FF"
            opacity={isProcessing || isSpeaking ? p.opacity * 1.3 : p.opacity}
            filter="url(#particleGlow)"
            className={cn(
              "transition-all duration-500",
              isProcessing && "animate-pulse"
            )}
            style={{
              animationDelay: `${p.delaySec}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
