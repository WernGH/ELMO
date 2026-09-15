"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

interface HolographicRingsProps {
  voiceState?: VoiceState;
  className?: string;
  size?: number | string; // diameter in pixels or CSS size (default responsive)
  responsive?: boolean;
}

export function HolographicRings({
  voiceState = "STANDBY",
  className,
  size,
  responsive = false,
}: HolographicRingsProps) {
  const isSpeaking = voiceState === "ELMO_SPEAKING";
  const isUserSpeaking = voiceState === "USER_SPEAKING";
  const isListening = voiceState === "LISTENING";
  const isProcessing = voiceState === "PROCESSING";
  const isInterrupted = voiceState === "INTERRUPTED";
  const isError = voiceState === "ERROR";

  const dimensionStyle = size
    ? typeof size === "number"
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size }
    : undefined;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center pointer-events-none select-none",
        !size && (responsive
          ? "w-[300px] h-[300px] sm:w-[460px] sm:h-[460px] md:w-[600px] md:h-[600px] lg:w-[720px] lg:h-[720px]"
          : "w-[420px] h-[420px]"),
        className
      )}
      style={dimensionStyle}
      aria-hidden="true"
    >
      {/* 1. Outermost Cyan Atmospheric Halo */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border border-cyan-500/15 transition-all duration-700",
          (isListening || isUserSpeaking) && "border-cyan-400/30 shadow-[0_0_50px_rgba(0,210,255,0.2)]",
          isSpeaking && "border-blue-500/40 shadow-[0_0_60px_rgba(0,132,255,0.3)]",
          isProcessing && "border-cyan-300/40 shadow-[0_0_55px_rgba(0,229,255,0.25)]",
          isInterrupted && "border-white/50 shadow-[0_0_70px_rgba(0,210,255,0.6)]",
          isError && "border-rose-500/40 shadow-[0_0_45px_rgba(244,63,94,0.3)]"
        )}
      />

      {/* 2. Outer Orbiting Ring with Degree Ticks & Data Nodes */}
      <div
        className={cn(
          "absolute w-[94%] h-[94%] rounded-full border border-dashed border-cyan-500/25 transition-transform duration-1000",
          isProcessing ? "animate-[spin_8s_linear_infinite]" : "animate-[spin_40s_linear_infinite]",
          isError && "border-rose-500/30 animate-none"
        )}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#00D2FF]" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#0084FF]" />
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#00F0FF]" />
        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#00D2FF]" />
        {/* Diagonal Orbit Nodes */}
        <div className="absolute top-[14%] left-[14%] w-1 h-1 rounded-full bg-cyan-400 opacity-60" />
        <div className="absolute bottom-[14%] right-[14%] w-1 h-1 rounded-full bg-cyan-400 opacity-60" />
      </div>

      {/* 3. Mid Holographic Tech Ring (Counter-rotating with Telemetry) */}
      <div
        className={cn(
          "absolute w-[82%] h-[82%] rounded-full border border-[#182C4A] transition-all duration-700",
          isProcessing && "animate-[spin_12s_linear_infinite_reverse] border-cyan-400/50",
          (isListening || isUserSpeaking) && "border-cyan-500/35 animate-[pulse_3s_ease-in-out_infinite]",
          isSpeaking && "border-blue-400/50 animate-[spin_20s_linear_infinite_reverse]",
          isError && "border-rose-500/30 animate-none"
        )}
      >
        {/* Tech Coordinates */}
        <span className="absolute top-1.5 left-6 font-mono text-[9px] text-cyan-400/50 tracking-widest uppercase">
          ELMO // AZIMUTH 340°
        </span>
        <span className="absolute bottom-1.5 right-6 font-mono text-[9px] text-blue-400/50 tracking-widest uppercase">
          HOLO-RING // SYNCHRONIZED
        </span>
      </div>

      {/* 4. Active Energy Frequency Ring */}
      <div
        className={cn(
          "absolute w-[70%] h-[70%] rounded-full border-2 border-cyan-400/30 transition-all duration-500",
          isUserSpeaking && "border-cyan-400 scale-105 shadow-[0_0_35px_rgba(0,210,255,0.45)] animate-pulse",
          isSpeaking && "border-blue-400 scale-105 shadow-[0_0_40px_rgba(0,132,255,0.45)] animate-[pulse_1.5s_ease-in-out_infinite]",
          isProcessing && "border-dashed border-cyan-300 animate-[spin_6s_linear_infinite] shadow-[0_0_30px_rgba(0,229,255,0.4)]",
          isInterrupted && "border-cyan-200 scale-110 shadow-[0_0_50px_rgba(0,210,255,0.8)]",
          isError && "border-rose-500 scale-100 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
        )}
      />

      {/* 5. Inner Core Halo & Depth Layer */}
      <div
        className={cn(
          "absolute w-[56%] h-[56%] rounded-full border border-cyan-500/25 bg-gradient-to-b from-cyan-950/20 to-blue-950/30 backdrop-blur-[2px] transition-all duration-700",
          (isListening || isUserSpeaking) && "shadow-[inset_0_0_30px_rgba(0,210,255,0.25)]",
          isSpeaking && "shadow-[inset_0_0_35px_rgba(0,132,255,0.3)]"
        )}
      />

      {/* 4 Cyber Corner Crosshairs */}
      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-cyan-500/40" />
      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-cyan-500/40" />
      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-cyan-500/40" />
      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-cyan-500/40" />
    </div>
  );
}
