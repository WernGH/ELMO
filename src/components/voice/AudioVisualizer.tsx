"use client";

import React, { useEffect, useRef } from "react";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  voiceState?: VoiceState;
  audioManager?: AudioManager;
  variant?: "equalizer" | "waveform" | "circular";
  barsCount?: number;
  className?: string;
}

export function AudioVisualizer({
  voiceState = "STANDBY",
  audioManager,
  variant = "equalizer",
  barsCount = 24,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mgr = audioManager || AudioManager.getInstance();
    const freqBuffer = new Uint8Array(32);
    let syntheticPhase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = Math.max(2, (width / barsCount) - 3);

      if (voiceState === "USER_SPEAKING" || voiceState === "LISTENING") {
        // Read live microphone frequency data
        mgr.getFrequencyData(freqBuffer);

        for (let i = 0; i < barsCount; i++) {
          const sampleIdx = Math.floor((i / barsCount) * freqBuffer.length);
          const rawVal = freqBuffer[sampleIdx] || 0;
          const normalized = rawVal / 255;
          const barHeight = Math.max(4, normalized * (height * 0.85));

          const x = i * (barWidth + 3) + 2;
          const y = height - barHeight;

          // Gradient: Electric Blue to Neon Cyan
          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, "#0084FF");
          grad.addColorStop(1, "#00F0FF");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (voiceState === "ELMO_SPEAKING") {
        // Generative synthetic speech waveform in Electric Blue & Bright Cyan-White
        syntheticPhase += 0.08;

        for (let i = 0; i < barsCount; i++) {
          const sinVal1 = Math.sin(syntheticPhase + i * 0.35);
          const sinVal2 = Math.cos(syntheticPhase * 0.7 + i * 0.2);
          const combined = Math.abs(sinVal1 * 0.6 + sinVal2 * 0.4);
          const barHeight = Math.max(4, combined * (height * 0.8));

          const x = i * (barWidth + 3) + 2;
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, "#082046");
          grad.addColorStop(0.5, "#0084FF");
          grad.addColorStop(1, "#70F2FF");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (voiceState === "PROCESSING") {
        // Scanning electric blue pulse
        syntheticPhase += 0.05;
        const activeIdx = Math.floor(((Math.sin(syntheticPhase) + 1) / 2) * barsCount);

        for (let i = 0; i < barsCount; i++) {
          const dist = Math.abs(i - activeIdx);
          const barHeight = Math.max(3, Math.max(0, 1 - dist * 0.25) * (height * 0.6));
          const x = i * (barWidth + 3) + 2;
          const y = height - barHeight;

          ctx.fillStyle = dist <= 1 ? "#00D2FF" : "#13243F";
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (voiceState === "INTERRUPTED") {
        // Flash electric blue spike
        for (let i = 0; i < barsCount; i++) {
          const barHeight = i % 2 === 0 ? height * 0.7 : height * 0.3;
          const x = i * (barWidth + 3) + 2;
          const y = height - barHeight;

          ctx.fillStyle = "#00D2FF";
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // STANDBY: Subtle resting baseline
        for (let i = 0; i < barsCount; i++) {
          const x = i * (barWidth + 3) + 2;
          const y = height - 3;

          ctx.fillStyle = "#101E35";
          ctx.fillRect(x, y, barWidth, 3);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [voiceState, audioManager, barsCount]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl bg-[#060D1A]/90 border border-[#162845] shadow-commandCard backdrop-blur-md",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        width={barsCount * 8}
        height={32}
        className="w-full h-8 block"
        aria-label={`Audio visualizer reacting to ${voiceState}`}
      />
    </div>
  );
}
