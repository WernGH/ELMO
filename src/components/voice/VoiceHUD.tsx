"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  AlertTriangle,
  Loader2,
  Sparkles,
  MessageSquare,
  X,
  RotateCcw,
  Sliders,
  Shield,
  Clock,
} from "lucide-react";
import { VoiceError, VoiceState, WakeWordStatus } from "@/types/voice.types";
import { cn } from "@/lib/utils";

interface VoiceHUDProps {
  state: VoiceState;
  transcript: string;
  isFinal: boolean;
  error: VoiceError | null;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  onSwitchToText: () => void;
  onClearError: () => void;
  isSTTSupported: boolean;
  isTTSSupported: boolean;
  wakeWordStatus?: WakeWordStatus;
  wakeWord?: string;
  isInConversationWindow?: boolean;
  conversationTimerSeconds?: number;
  isMicrophoneActive?: boolean;
  onOpenSettings?: () => void;
}

export function VoiceHUD({
  state,
  transcript,
  isFinal,
  error,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  onSwitchToText,
  onClearError,
  isSTTSupported,
  isTTSSupported,
  wakeWordStatus = "active",
  wakeWord = "Hey ELMO",
  isInConversationWindow = false,
  conversationTimerSeconds = 0,
  isMicrophoneActive = false,
  onOpenSettings,
}: VoiceHUDProps) {
  // State description badges
  const stateLabels: Record<VoiceState, { text: string; color: string; dot: string }> = {
    idle: {
      text: "IDLE / READY",
      color: "text-zinc-400 border-zinc-700/60 bg-zinc-900/40",
      dot: "bg-cyan-500/50",
    },
    listening: {
      text: "LISTENING TO SUPERIOR",
      color: "text-cyan-300 border-cyan-500/40 bg-cyan-950/40 shadow-[0_0_12px_rgba(0,210,255,0.2)]",
      dot: "bg-cyan-400 animate-ping shadow-[0_0_8px_#00D2FF]",
    },
    processing: {
      text: "PROCESSING COGNITIVE STREAM",
      color: "text-blue-300 border-blue-500/40 bg-blue-950/40 shadow-[0_0_12px_rgba(0,132,255,0.2)]",
      dot: "bg-blue-400 animate-pulse shadow-[0_0_8px_#0084FF]",
    },
    speaking: {
      text: "ELMO SPEAKING",
      color: "text-cyan-200 border-cyan-400/50 bg-cyan-950/50 shadow-[0_0_16px_rgba(0,210,255,0.25)]",
      dot: "bg-cyan-300 animate-pulse shadow-[0_0_8px_#00F0FF]",
    },
    error: {
      text: "VOICE SYSTEM ALERT",
      color: "text-red-400 border-red-500/40 bg-red-950/30",
      dot: "bg-red-400 shadow-[0_0_8px_#FF2255]",
    },
  };

  const currentLabel = stateLabels[state];

  // Wake word badge styling
  const wakeWordBadges: Record<
    WakeWordStatus,
    { text: string; color: string; dot: string }
  > = {
    active: {
      text: "ACTIVE",
      color: "text-cyan-300 border-cyan-500/40 bg-cyan-950/30 shadow-[0_0_10px_rgba(0,210,255,0.15)]",
      dot: "bg-cyan-400 animate-pulse shadow-[0_0_6px_#00D2FF]",
    },
    paused: {
      text: "PAUSED",
      color: "text-amber-400 border-amber-500/30 bg-amber-950/20",
      dot: "bg-amber-400",
    },
    disabled: {
      text: "DISABLED",
      color: "text-zinc-400 border-zinc-700/40 bg-zinc-900/40",
      dot: "bg-zinc-500",
    },
    unsupported: {
      text: "UNSUPPORTED",
      color: "text-red-400 border-red-500/30 bg-red-950/20",
      dot: "bg-red-400",
    },
  };

  const currentWakeBadge = wakeWordBadges[wakeWordStatus];

  return (
    <div className="relative w-full rounded-2xl border border-cyan-500/20 bg-[#060A14]/95 backdrop-blur-2xl p-6 shadow-2xl shadow-black/80 overflow-hidden transition-all duration-300">
      {/* Background Radial Glow */}
      <div
        className={cn(
          "absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700",
          state === "listening" && "bg-cyan-400 opacity-25",
          state === "speaking" && "bg-blue-500 opacity-30",
          state === "processing" && "bg-cyan-600 opacity-20",
          state === "error" && "bg-red-500 opacity-25",
          state === "idle" && "bg-blue-600 opacity-15"
        )}
      />

      {/* Cyber Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#14233D] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-mono tracking-wider uppercase backdrop-blur-md">
            <span className={cn("w-2 h-2 rounded-full", currentLabel.dot)} />
            <span className={currentLabel.color.split(" ")[0]}>{currentLabel.text}</span>
          </div>

          {/* Privacy & Wake Word Badges */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {/* Microphone Indicator */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all",
                isMicrophoneActive
                  ? "border-cyan-500/40 bg-cyan-950/30 text-cyan-300 shadow-[0_0_8px_rgba(0,210,255,0.15)]"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
              )}
              title="Microphone hardware monitoring status"
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isMicrophoneActive ? "bg-cyan-400 animate-pulse shadow-[0_0_6px_#00D2FF]" : "bg-zinc-600"
                )}
              />
              <span>MIC: {isMicrophoneActive ? "ON" : "OFF"}</span>
            </div>

            {/* Wake Word Status Indicator */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-md border",
                currentWakeBadge.color
              )}
              title={`Wake word: "${wakeWord}"`}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", currentWakeBadge.dot)} />
              <span>WAKE: {currentWakeBadge.text}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#182A45] bg-[#091120] hover:bg-[#0E1A30] hover:border-cyan-500/40 text-xs font-medium text-zinc-300 hover:text-white transition-all shadow-sm"
              title="Configure wake word, interruption, and voice settings"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice Settings</span>
            </button>
          )}

          {/* Switch to Text Mode */}
          <button
            onClick={onSwitchToText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#182A45] bg-[#091120] hover:bg-[#0E1A30] hover:border-cyan-500/40 text-xs font-medium text-zinc-300 hover:text-white transition-all shadow-sm"
            title="Switch back to standard text conversation"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Text Mode</span>
          </button>
        </div>
      </div>

      {/* Active Conversation Window Banner */}
      {isInConversationWindow && state !== "listening" && (
        <div className="mt-3 p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300 relative z-10 animate-fade-in shadow-[0_0_12px_rgba(0,210,255,0.1)]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-mono text-[11px]">
              Active Conversation Mode — Speak naturally without &ldquo;{wakeWord}&rdquo;
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] bg-cyan-900/50 px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-200">
            <Clock className="w-3 h-3 text-cyan-300" />
            <span>{conversationTimerSeconds}s remaining</span>
          </div>
        </div>
      )}

      {/* Central Visualizer Area */}
      <div className="py-8 flex flex-col items-center justify-center relative z-10">
        {/* Orbital Visualizer Ring */}
        <div className="relative flex items-center justify-center">
          {/* Animated Waveform Waves for Listening */}
          {state === "listening" && (
            <>
              <div className="absolute w-36 h-36 rounded-full border border-cyan-400/40 animate-ping opacity-35 pointer-events-none" />
              <div className="absolute w-48 h-48 rounded-full border border-cyan-500/25 animate-pulse pointer-events-none" />
              <div className="absolute w-60 h-60 rounded-full border border-blue-500/15 pointer-events-none" />
            </>
          )}

          {/* Equalizer Waveform Waves for Speaking */}
          {state === "speaking" && (
            <>
              <div className="absolute w-36 h-36 rounded-full border border-cyan-400/50 animate-ping opacity-40 pointer-events-none" />
              <div className="absolute w-52 h-52 rounded-full border border-blue-500/30 animate-pulse pointer-events-none" />
              <div className="absolute w-64 h-64 rounded-full border border-cyan-500/15 pointer-events-none" />
            </>
          )}

          {/* Processing Spinner */}
          {state === "processing" && (
            <>
              <div className="absolute w-36 h-36 rounded-full border-2 border-dashed border-cyan-400/50 animate-spin pointer-events-none" />
              <div className="absolute w-48 h-48 rounded-full border border-blue-500/30 animate-pulse pointer-events-none" />
            </>
          )}

          {/* Main Action Button */}
          {state === "speaking" ? (
            <button
              onClick={onStopSpeaking}
              className="w-24 h-24 rounded-full bg-gradient-to-b from-cyan-500/20 to-blue-950/80 border-2 border-cyan-400 shadow-[0_0_35px_rgba(0,210,255,0.4)] flex flex-col items-center justify-center gap-1 text-cyan-200 hover:scale-105 active:scale-95 transition-all duration-200 group"
              title="Stop ELMO Speaking (or say 'Hey ELMO' to interrupt)"
            >
              <VolumeX className="w-8 h-8 text-cyan-300 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
                Stop
              </span>
            </button>
          ) : state === "listening" ? (
            <button
              onClick={onStopListening}
              className="w-24 h-24 rounded-full bg-gradient-to-b from-cyan-500/30 to-blue-950/90 border-2 border-cyan-300 shadow-[0_0_40px_rgba(0,210,255,0.5)] flex flex-col items-center justify-center gap-1 text-cyan-100 hover:scale-105 active:scale-95 transition-all duration-200 group"
              title="Stop Listening & Transmit"
            >
              <MicOff className="w-8 h-8 text-cyan-200 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
                Done
              </span>
            </button>
          ) : state === "processing" ? (
            <div className="w-24 h-24 rounded-full bg-[#081020] border-2 border-cyan-400/70 shadow-[0_0_30px_rgba(0,132,255,0.35)] flex flex-col items-center justify-center gap-1 text-cyan-300">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">Reasoning</span>
            </div>
          ) : (
            <button
              onClick={onStartListening}
              className="w-24 h-24 rounded-full bg-gradient-to-b from-[#0F1D35] to-[#060B16] border-2 border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(0,210,255,0.35)] flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white hover:scale-105 active:scale-95 transition-all duration-200 group shadow-lg"
              title={`Click or say "${wakeWord}" to activate`}
            >
              <Mic className="w-8 h-8 text-cyan-400 group-hover:text-cyan-200 group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(0,210,255,0.6)]" />
              <span className="text-[10px] font-mono tracking-wider uppercase font-medium text-cyan-300/80 group-hover:text-cyan-200">
                Speak
              </span>
            </button>
          )}
        </div>

        {/* Dynamic Voice Status Subtitle */}
        <div className="mt-5 text-center max-w-lg">
          {state === "idle" && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-300 font-mono">
                {wakeWordStatus === "active" ? (
                  <>
                    Say <span className="text-cyan-400 font-bold font-mono">&ldquo;{wakeWord}&rdquo;</span> hands-free or tap microphone.
                  </>
                ) : (
                  <>Tap the microphone button to speak with ELMO.</>
                )}
              </p>
              <p className="text-[11px] text-cyan-400/60 italic">
                &ldquo;{wakeWord}, what tasks are currently running?&rdquo;
              </p>
            </div>
          )}

          {state === "listening" && (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce shadow-[0_0_6px_#00D2FF]" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s] shadow-[0_0_6px_#00D2FF]" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s] shadow-[0_0_6px_#00D2FF]" />
                <span className="text-xs font-mono text-cyan-400 tracking-wide font-medium ml-1">
                  Listening to owner speech...
                </span>
              </div>
              <p className="text-sm text-white font-medium min-h-[24px] px-4 py-1.5 rounded-lg bg-[#0A1324] border border-cyan-500/20 mt-2 shadow-inner">
                {transcript || (
                  <span className="text-zinc-500 italic">Say your directive now...</span>
                )}
              </p>
            </div>
          )}

          {state === "processing" && (
            <div className="space-y-1">
              <p className="text-xs font-mono text-cyan-300">
                Cognitive synthesis in progress...
              </p>
              {transcript && (
                <p className="text-xs text-zinc-400 italic">
                  &ldquo;{transcript}&rdquo;
                </p>
              )}
            </div>
          )}

          {state === "speaking" && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-end gap-1 h-4">
                  <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2 shadow-[0_0_6px_#00D2FF]" />
                  <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4 shadow-[0_0_6px_#00D2FF]" />
                  <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3 shadow-[0_0_6px_#00D2FF]" />
                  <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4 shadow-[0_0_6px_#00D2FF]" />
                  <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2 shadow-[0_0_6px_#00D2FF]" />
                </div>
                <span className="text-xs font-mono text-cyan-300">
                  ELMO response playback active
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Say <span className="text-cyan-300 font-mono font-medium">&ldquo;{wakeWord}&rdquo;</span> to interrupt, or click STOP above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="relative z-10 mt-2 p-3.5 rounded-xl border border-red-500/40 bg-red-950/40 backdrop-blur-md flex items-start gap-3 text-red-200">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-semibold text-red-300 font-mono uppercase">
              {error.code.replace(/_/g, " ")}
            </div>
            <p className="mt-0.5 text-zinc-300 leading-relaxed">{error.message}</p>
            {error.details && (
              <p className="mt-1 font-mono text-[10px] text-zinc-400">{error.details}</p>
            )}
            {(error.code === "network_error" || error.code === "speech_recognition_error") && (
              <button
                onClick={() => {
                  onClearError();
                  onStartListening();
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-900/50 hover:bg-red-800/80 border border-red-500/40 text-red-200 text-[11px] font-mono font-medium transition-all hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-3 h-3 text-red-300" />
                Retry Voice Input
              </button>
            )}
          </div>
          <button
            onClick={onClearError}
            className="p-1 rounded-md hover:bg-red-900/50 text-red-400 hover:text-white transition-colors"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Info / Support Badges */}
      <div className="mt-4 pt-3 border-t border-[#14233D] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 relative z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isSTTSupported ? "bg-cyan-400 shadow-[0_0_6px_#00D2FF]" : "bg-zinc-600"
              )}
            />
            STT: {isSTTSupported ? "Native Engine" : "Unavailable"}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isTTSSupported ? "bg-cyan-400 shadow-[0_0_6px_#00D2FF]" : "bg-zinc-600"
              )}
            />
            TTS: {isTTSSupported ? "SpeechSynthesis" : "Unavailable"}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>Local Wake Word</span>
          </span>
        </div>

        <span className="text-zinc-600 hidden sm:inline">
          Hands-Free Wake Architecture v3.1
        </span>
      </div>
    </div>
  );
}
