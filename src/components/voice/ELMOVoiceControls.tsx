"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { Mic, MicOff, Square, Pause, Play, LogOut, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ELMOVoiceControlsProps {
  voiceState: VoiceState;
  isVoiceActive: boolean;
  isPaused: boolean;
  micMuted?: boolean;
  onToggleVoiceMode?: () => void;
  onPauseVoiceMode?: () => void;
  onResumeVoiceMode?: () => void;
  onToggleManualMic?: () => void;
  onStopSpeaking?: () => void;
  onExitSpeakMode?: () => void;
  className?: string;
}

export function ELMOVoiceControls({
  voiceState,
  isVoiceActive,
  isPaused,
  micMuted = false,
  onToggleVoiceMode,
  onPauseVoiceMode,
  onResumeVoiceMode,
  onToggleManualMic,
  onStopSpeaking,
  onExitSpeakMode,
  className,
}: ELMOVoiceControlsProps) {
  const isSpeaking = voiceState === "ELMO_SPEAKING";

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2.5 sm:gap-3.5 select-none",
        className
      )}
    >
      {/* 1. Primary Start / Stop Voice Mode */}
      {onToggleVoiceMode && (
        <button
          onClick={onToggleVoiceMode}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-md",
            isVoiceActive && voiceState !== "STANDBY"
              ? "bg-cyan-950/60 border border-cyan-500/60 text-cyan-300 hover:bg-rose-950/50 hover:border-rose-500/50 hover:text-rose-300"
              : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.6)] animate-pulse"
          )}
          title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Mode"}
        >
          <Radio className={cn("w-3.5 h-3.5", isVoiceActive ? "text-cyan-400" : "text-black")} />
          <span>{isVoiceActive && voiceState !== "STANDBY" ? "STOP VOICE" : "START VOICE"}</span>
        </button>
      )}

      {/* 2. Mute / Unmute Microphone */}
      <button
        onClick={onToggleManualMic}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all backdrop-blur-md",
          micMuted
            ? "bg-rose-950/40 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            : "bg-[#060D1A]/80 border-[#14233D] text-zinc-300 hover:text-white hover:border-cyan-500/40"
        )}
        title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
      >
        {micMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
        <span className="hidden sm:inline">{micMuted ? "UNMUTE" : "MUTE"}</span>
      </button>

      {/* 3. Instant Barge-In Interrupt (Pulsing when ELMO is speaking) */}
      {isSpeaking && onStopSpeaking && (
        <button
          onClick={onStopSpeaking}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-200 text-xs font-mono font-bold shadow-[0_0_20px_rgba(0,210,255,0.4)] animate-pulse hover:bg-cyan-500/30 transition-all"
          title="Interrupt ELMO speaking"
        >
          <Square className="w-3 h-3 fill-cyan-400 text-cyan-400" />
          <span>INTERRUPT</span>
        </button>
      )}

      {/* 4. Pause / Resume Voice Mode */}
      {isVoiceActive && voiceState !== "STANDBY" && (
        <button
          onClick={isPaused ? onResumeVoiceMode : onPauseVoiceMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#060D1A]/80 border border-[#14233D] text-zinc-300 hover:text-white hover:border-cyan-500/40 text-xs font-mono font-bold transition-all backdrop-blur-md"
          title={isPaused ? "Resume Voice Engine" : "Pause Voice Engine"}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-cyan-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
          <span className="hidden sm:inline">{isPaused ? "RESUME" : "PAUSE"}</span>
        </button>
      )}

      {/* 4. Exit Speak Mode */}
      {onExitSpeakMode && (
        <button
          onClick={onExitSpeakMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#060D1A]/80 border border-[#14233D] text-zinc-400 hover:text-white hover:border-cyan-500/40 text-xs font-mono transition-all backdrop-blur-md"
          title="Exit Speak Mode (or press Escape)"
        >
          <LogOut className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">EXIT SPEAK MODE</span>
        </button>
      )}
    </div>
  );
}
