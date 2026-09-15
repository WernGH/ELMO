"use client";

import React from "react";
import { ElmoCore } from "@/components/elmo";
import { VoiceState } from "@/services/voice/voice.types";
import { ELMOStatusIndicator } from "@/components/ui/ELMOStatusIndicator";
import { Mic, Sparkles, ArrowRight, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ELMOCommandCenterProps {
  status?: string;
  voiceState?: VoiceState;
  robotState?: any; // Backwards compatibility
  onEnterSpeakMode: () => void;
  onStartConversation?: () => void;
  onViewActivity?: () => void;
  className?: string;
}

export function ELMOCommandCenter({
  status = "READY",
  voiceState,
  robotState = "STANDBY",
  onEnterSpeakMode,
  onStartConversation,
  onViewActivity,
  className,
}: ELMOCommandCenterProps) {
  // Normalize state to VoiceState
  const activeVoiceState: VoiceState =
    voiceState ||
    (robotState === "IDLE" ? "STANDBY" : (robotState as VoiceState)) ||
    "STANDBY";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#060D1A] via-[#040812] to-[#02050B] border border-cyan-500/30 p-6 shadow-[0_0_35px_rgba(0,210,255,0.12)] backdrop-blur-2xl transition-all duration-300",
        className
      )}
    >
      {/* Background Cybernetic Grid Accent */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(0,210,255,0.25) 0%, transparent 60%), linear-gradient(to right, #11223D 1px, transparent 1px), linear-gradient(to bottom, #11223D 1px, transparent 1px)",
          backgroundSize: "100% 100%, 32px 32px, 32px 32px",
        }}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#14233D]">
        <div className="flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-white">
            ELMO COMMAND CENTER
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:inline">
            SYSTEM STATUS:
          </span>
          <ELMOStatusIndicator state="READY" size="sm" />
        </div>
      </div>

      {/* Center Presentation: Floating AI Core with Controlled Illumination */}
      <div className="relative z-10 my-6 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Floating AI Core (Compact Dashboard Scale) */}
          <ElmoCore
            voiceState={activeVoiceState}
            size="sm"
            interactive={true}
            enableWorkforceSockets={true}
            onStateChange={onEnterSpeakMode}
          />
        </div>

        {/* Prompt Question & Guidance */}
        <div className="mt-3 text-center space-y-1">
          <p className="text-sm sm:text-base font-bold text-white tracking-wide">
            &ldquo;How can I help you today?&rdquo;
          </p>
          <p className="text-xs text-cyan-200/70 font-sans max-w-sm">
            Autonomous operations and real-time business intelligence ready. Hands-free voice enabled.
          </p>
        </div>
      </div>

      {/* Action Area: Prominent Action Buttons */}
      <div className="relative z-10 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onEnterSpeakMode}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,210,255,0.45)] hover:shadow-[0_0_35px_rgba(0,210,255,0.7)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 group"
          id="talk-to-elmo-btn"
        >
          <Mic className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
          <span>TALK TO ELMO</span>
          <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={onStartConversation || onEnterSpeakMode}
          className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-[#091326] border border-[#1E3557] hover:border-cyan-400/50 text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#0E1D3B] transition-all flex items-center justify-center gap-2"
          id="start-conversation-btn"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>START CONVERSATION</span>
        </button>

        <button
          onClick={onViewActivity || onEnterSpeakMode}
          className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-[#070E1C] border border-[#15253F] hover:border-cyan-400/40 text-zinc-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#0A162C] transition-all flex items-center justify-center gap-2"
          id="view-activity-btn"
        >
          <Radio className="w-4 h-4 text-zinc-400" />
          <span>VIEW ACTIVITY</span>
        </button>
      </div>
    </div>
  );
}
