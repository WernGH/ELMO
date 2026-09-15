"use client";

import React from "react";
import { Mic, MicOff, Radio, Shield, Volume2, Pause, Play, Power, VolumeX } from "lucide-react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

interface VoiceControlsPanelProps {
  voiceState: VoiceState;
  isVoiceActive: boolean;
  isPaused: boolean;
  micPermission: string;
  onToggleVoiceMode: () => void;
  onPauseVoiceMode: () => void;
  onResumeVoiceMode: () => void;
  onToggleManualMic?: () => void;
  onStopSpeaking?: () => void;
  className?: string;
}

export function VoiceControlsPanel({
  voiceState,
  isVoiceActive,
  isPaused,
  micPermission,
  onToggleVoiceMode,
  onPauseVoiceMode,
  onResumeVoiceMode,
  onToggleManualMic,
  onStopSpeaking,
  className,
}: VoiceControlsPanelProps) {
  const isMicActive = micPermission === "granted" && isVoiceActive && !isPaused;
  const isSpeaking = voiceState === "ELMO_SPEAKING";

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#060D1A]/95 border border-[#14233D] p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl",
        className
      )}
    >
      {/* Cyber Corner Marks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#14233D]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            VOICE CONTROLS
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
          TELEMETRY // v3.2
        </span>
      </div>

      {/* Futuristic Status Grid */}
      <div className="mt-4 space-y-2.5 text-xs font-mono">
        {/* Microphone */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#081222] border border-[#142642]">
          <span className="text-zinc-400">Microphone</span>
          <span
            className={cn(
              "font-bold flex items-center gap-1.5",
              isMicActive ? "text-cyan-400" : "text-zinc-500"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full inline-block",
                isMicActive ? "bg-cyan-400 shadow-[0_0_6px_#00D2FF] animate-pulse" : "bg-zinc-600"
              )}
            />
            {isMicActive ? "ACTIVE" : isPaused ? "PAUSED" : "STANDBY"}
          </span>
        </div>

        {/* Voice */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#081222] border border-[#142642]">
          <span className="text-zinc-400">Voice</span>
          <span className="text-cyan-300 font-bold">ELMO Natural</span>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#081222] border border-[#142642]">
          <span className="text-zinc-400">Language</span>
          <span className="text-cyan-300 font-bold">English (US)</span>
        </div>

        {/* Interruption */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#081222] border border-[#142642]">
          <span className="text-zinc-400">Interruption</span>
          <span className="text-cyan-400 font-bold flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            ENABLED (Barge-In)
          </span>
        </div>

        {/* Voice Mode Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#081222] border border-[#142642]">
          <span className="text-zinc-400">Voice Mode</span>
          <span
            className={cn(
              "font-bold px-2 py-0.5 rounded text-[10px] tracking-wider",
              !isVoiceActive
                ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                : isPaused
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,210,255,0.2)]"
            )}
          >
            {!isVoiceActive ? "OFF" : isPaused ? "PAUSED" : "ON (Continuous)"}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 space-y-2">
        {!isVoiceActive ? (
          <button
            onClick={onToggleVoiceMode}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-mono font-bold text-xs shadow-[0_0_20px_rgba(0,210,255,0.45)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Power className="w-4 h-4" />
            <span>ENABLE VOICE MODE</span>
          </button>
        ) : isPaused ? (
          <div className="flex gap-2">
            <button
              onClick={onResumeVoiceMode}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-mono font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME VOICE MODE</span>
            </button>
            <button
              onClick={onToggleVoiceMode}
              className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white text-xs font-mono transition-colors"
              title="Turn Voice Mode Off"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={onPauseVoiceMode}
                className="flex-1 py-2 px-3 rounded-xl bg-[#091528] border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 font-mono font-bold text-xs shadow-[0_0_12px_rgba(0,210,255,0.15)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE VOICE MODE</span>
              </button>

              <button
                onClick={onToggleVoiceMode}
                className="px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 text-xs font-mono transition-colors"
                title="Disable Voice Mode"
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* If currently speaking, quick stop/barge-in button */}
            {isSpeaking && onStopSpeaking && (
              <button
                onClick={onStopSpeaking}
                className="w-full py-1.5 px-3 rounded-lg bg-cyan-950/60 border border-cyan-400/50 text-cyan-200 text-[11px] font-mono flex items-center justify-center gap-2 hover:bg-cyan-900/50 transition-colors animate-pulse"
              >
                <VolumeX className="w-3.5 h-3.5 text-cyan-300" />
                <span>INTERRUPT SPEECH</span>
              </button>
            )}
          </div>
        )}

        {/* Small Manual Microphone Fallback Control */}
        {onToggleManualMic && (
          <div className="pt-2 border-t border-[#14233D] flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Manual Fallback:</span>
            <button
              onClick={onToggleManualMic}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] transition-all",
                voiceState === "USER_SPEAKING" || voiceState === "LISTENING"
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                  : "bg-[#081222] border-[#162744] text-zinc-400 hover:text-white hover:border-cyan-500/30"
              )}
              title="Manual microphone trigger fallback"
            >
              {voiceState === "USER_SPEAKING" || voiceState === "LISTENING" ? (
                <>
                  <Mic className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Mute Mic</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3 h-3 text-zinc-500" />
                  <span>Unmute Mic</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
