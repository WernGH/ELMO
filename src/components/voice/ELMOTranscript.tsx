"use client";

import React from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { Sparkles, User, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ELMOTranscriptProps {
  voiceState: VoiceState;
  liveTranscript?: string;
  lastElmoResponse?: string;
  className?: string;
}

export function ELMOTranscript({
  voiceState,
  liveTranscript,
  lastElmoResponse,
  className,
}: ELMOTranscriptProps) {
  const isUserSpeaking = voiceState === "USER_SPEAKING";
  const isElmoSpeaking = voiceState === "ELMO_SPEAKING";

  return (
    <div
      className={cn(
        "w-full max-w-2xl px-4 py-3 rounded-2xl bg-[#060D1A]/90 border border-cyan-500/30 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.6)] transition-all duration-300",
        className
      )}
    >
      {/* 1. Live User Speech Interim Transcript */}
      {isUserSpeaking && liveTranscript ? (
        <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
          <div className="p-1 rounded-lg bg-blue-500/20 text-blue-300 mt-0.5 shrink-0">
            <Mic className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
              YOU (TRANSCRIBING)
            </span>
            <p className="text-xs sm:text-sm font-sans text-cyan-100 font-medium leading-relaxed">
              &ldquo;{liveTranscript}&rdquo;
            </p>
          </div>
        </div>
      ) : isElmoSpeaking && lastElmoResponse ? (
        /* 2. ELMO Spoken Subtitles */
        <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
          <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 mt-0.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block mb-0.5">
              ELMO (SPOKEN BRIEFING)
            </span>
            <p className="text-xs sm:text-sm font-sans text-white leading-relaxed line-clamp-3">
              {lastElmoResponse}
            </p>
          </div>
        </div>
      ) : (
        /* 3. Subtle Conversational Idle / Status Placeholder */
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              {voiceState === "LISTENING"
                ? "Speak naturally — ELMO is listening..."
                : voiceState === "PROCESSING"
                ? "Synthesizing executive briefing..."
                : "Voice engine online"}
            </span>
          </div>
          <span className="text-[9px] text-zinc-500 hidden sm:inline">NO WAKE WORD REQUIRED</span>
        </div>
      )}
    </div>
  );
}
