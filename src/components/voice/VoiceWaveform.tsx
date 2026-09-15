"use client";

import React, { useRef, useEffect } from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { AudioManager } from "@/services/voice/audio-manager";
import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  voiceState: VoiceState;
  audioManager?: AudioManager;
  className?: string;
}

export function VoiceWaveform({
  voiceState,
  audioManager,
  className,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let audioLevel = 0;
    const unsub = audioManager?.subscribeAudioLevel((lvl) => {
      audioLevel = lvl;
    });

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      phaseRef.current += 0.04;
      const phase = phaseRef.current;

      // Extract real audio level if available
      const liveLevel = audioManager ? Math.max(audioLevel, audioManager.getRMS()) : 0;

      const isUserSpeaking = voiceState === "USER_SPEAKING";
      const isElmoSpeaking = voiceState === "ELMO_SPEAKING";
      const isListening = voiceState === "LISTENING";
      const isProcessing = voiceState === "PROCESSING";
      const isInterrupted = voiceState === "INTERRUPTED";
      const isError = voiceState === "ERROR";

      // 1. Determine Wave Parameters based on canonical voiceState
      let primaryColor = "#00D2FF"; // Bright Cyan
      let secondaryColor = "#0084FF"; // Electric Blue
      let amplitude = 12;
      let frequency = 0.015;
      let speed = 1.0;
      let numWaves = 3;

      if (isUserSpeaking) {
        // High reactivity to microphone energy
        const boost = Math.max(0.2, liveLevel * 2.8);
        amplitude = 28 * boost;
        frequency = 0.022;
        primaryColor = "#00F0FF";
        secondaryColor = "#0099FF";
        numWaves = 4;
      } else if (isElmoSpeaking) {
        // Expressive harmonic rhythmic sine waves
        const synthMod = 0.8 + 0.5 * Math.sin(phase * 2.5);
        amplitude = 24 * synthMod;
        frequency = 0.018;
        primaryColor = "#70F2FF";
        secondaryColor = "#0066FF";
        numWaves = 4;
      } else if (isProcessing) {
        // Quantum data particle wave / high frequency shimmer (NOT a generic spinner)
        amplitude = 10 + 6 * Math.sin(phase * 4);
        frequency = 0.045;
        speed = 2.2;
        primaryColor = "#00E5FF";
        secondaryColor = "#0044FF";
        numWaves = 5;
      } else if (isListening) {
        // Gentle, calm ambient breathing wave
        amplitude = 6 + 3 * Math.sin(phase * 0.8);
        frequency = 0.012;
        primaryColor = "#00D2FF";
        secondaryColor = "#0066CC";
        numWaves = 2;
      } else if (isInterrupted) {
        // Electric flash
        amplitude = 36;
        frequency = 0.035;
        primaryColor = "#FFFFFF";
        secondaryColor = "#00D2FF";
        numWaves = 5;
      } else if (isError) {
        // Alert glitch wave
        amplitude = 8;
        frequency = 0.03;
        primaryColor = "#F43F5E";
        secondaryColor = "#9F1239";
        numWaves = 2;
      } else {
        // Standby
        amplitude = 4;
        frequency = 0.01;
        primaryColor = "#1E3A5F";
        secondaryColor = "#0C192E";
        numWaves = 1;
      }

      // 2. Draw Multi-Layered Futuristic Glowing Waves
      for (let w = 0; w < numWaves; w++) {
        ctx.beginPath();
        const waveOffset = (w * Math.PI) / 3;
        const waveAmp = amplitude * (1 - w * 0.2);
        const waveColor = w === 0 ? primaryColor : secondaryColor;

        ctx.strokeStyle = waveColor;
        ctx.lineWidth = w === 0 ? 2.5 : 1.5;
        ctx.shadowColor = waveColor;
        ctx.shadowBlur = w === 0 ? 16 : 8;

        for (let x = 0; x < width; x += 2) {
          // Centered windowing envelope so wave tapers smoothly to 0 at edges
          const envelope = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x * frequency + phase * speed + waveOffset) *
              waveAmp *
              envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 3. Central Energy Beam for User and ELMO Speaking
      if (isUserSpeaking || isElmoSpeaking || isProcessing) {
        ctx.beginPath();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 10;
        ctx.shadowColor = primaryColor;
        ctx.moveTo(width * 0.25, centerY);
        ctx.lineTo(width * 0.75, centerY);
        ctx.stroke();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (unsub) unsub();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [voiceState, audioManager]);

  return (
    <div className={cn("relative flex flex-col items-center justify-center select-none w-full max-w-2xl px-4", className)}>
      <canvas
        ref={canvasRef}
        width={640}
        height={100}
        className="w-full h-16 sm:h-20 max-w-xl pointer-events-none drop-shadow-[0_0_20px_rgba(0,210,255,0.4)]"
      />
    </div>
  );
}
