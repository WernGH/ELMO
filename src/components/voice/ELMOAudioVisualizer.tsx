"use client";

import React, { useEffect, useRef } from "react";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

export interface ELMOAudioVisualizerProps {
  voiceState?: VoiceState;
  audioManager?: AudioManager;
  variant?: "waveform" | "equalizer" | "circular";
  barsCount?: number;
  className?: string;
  width?: number;
  height?: number;
}

export function ELMOAudioVisualizer({
  voiceState = "STANDBY",
  audioManager,
  variant = "waveform",
  barsCount = 32,
  className,
  width = 360,
  height = 64,
}: ELMOAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioLevelRef = useRef<number>(0);

  useEffect(() => {
    const mgr = audioManager || AudioManager.getInstance();
    const unsub = mgr.subscribeAudioLevel((level) => {
      audioLevelRef.current = level;
    });
    return () => unsub();
  }, [audioManager]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    let ttsPhase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      const isSpeaking = voiceState === "ELMO_SPEAKING";
      const isUserSpeaking = voiceState === "USER_SPEAKING";
      const isListening = voiceState === "LISTENING";
      const isProcessing = voiceState === "PROCESSING";
      const isInterrupted = voiceState === "INTERRUPTED";
      const isError = voiceState === "ERROR";

      if (variant === "waveform") {
        // High precision continuous neon harmonic sine wave
        phase += isProcessing ? 0.08 : isSpeaking ? 0.05 : isUserSpeaking ? 0.06 : 0.02;
        ttsPhase += 0.04;

        let amplitude = 0.06;
        if (isUserSpeaking) {
          amplitude = Math.min(0.85, 0.2 + audioLevelRef.current * 1.8);
        } else if (isSpeaking) {
          amplitude = 0.45 + Math.sin(ttsPhase * 2.5) * 0.25;
        } else if (isListening) {
          amplitude = 0.12 + Math.sin(phase * 1.5) * 0.04;
        } else if (isProcessing) {
          amplitude = 0.25 + Math.sin(phase * 4) * 0.1;
        } else if (isInterrupted) {
          amplitude = 0.02;
        }

        const strokeColor = isError
          ? "#FF3B5C"
          : isInterrupted
          ? "#FFB800"
          : isSpeaking
          ? "#00F0FF"
          : isUserSpeaking
          ? "#00D2FF"
          : isProcessing
          ? "#38BDF8"
          : "#0084FF";

        // Ambient glow backdrop line
        ctx.save();
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const normX = (x / w) * Math.PI * 2;
          const y =
            centerY +
            Math.sin(normX * 3 + phase) * (h * 0.4 * amplitude) +
            Math.sin(normX * 6 - phase * 0.8) * (h * 0.15 * amplitude);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 14;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.restore();

        // Sharp core neon stroke
        ctx.save();
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const normX = (x / w) * Math.PI * 2;
          const y =
            centerY +
            Math.sin(normX * 3 + phase) * (h * 0.4 * amplitude) +
            Math.sin(normX * 6 - phase * 0.8) * (h * 0.15 * amplitude);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = isSpeaking ? "#FFFFFF" : strokeColor;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.95;
        ctx.stroke();
        ctx.restore();
      } else if (variant === "equalizer") {
        // Futuristic bar equalizer
        const barWidth = Math.max(2, w / barsCount - 3);
        const activeColor = isError ? "#FF3B5C" : isSpeaking ? "#00F0FF" : "#0084FF";

        for (let i = 0; i < barsCount; i++) {
          let normalized = 0.1;
          if (isUserSpeaking) {
            normalized = Math.min(1, (audioLevelRef.current * 2 + Math.random() * 0.2));
          } else if (isSpeaking) {
            normalized = 0.3 + Math.abs(Math.sin((i / 4) + ttsPhase * 2)) * 0.6;
          } else if (isListening) {
            normalized = 0.15 + Math.abs(Math.sin((i / 8) + phase)) * 0.15;
          }

          const barHeight = Math.max(4, normalized * (h * 0.85));
          const x = i * (barWidth + 3) + 2;
          const y = h - barHeight;

          const grad = ctx.createLinearGradient(0, h, 0, y);
          grad.addColorStop(0, "#0084FF");
          grad.addColorStop(1, activeColor);

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [voiceState, variant, barsCount]);

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full max-w-full"
      />
    </div>
  );
}
