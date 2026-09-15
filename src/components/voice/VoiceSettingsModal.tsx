"use client";

import React from "react";
import {
  X,
  Shield,
  Volume2,
  Mic,
  Radio,
  Sliders,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { VoiceSettings } from "@/types/voice.types";
import { cn } from "@/lib/utils";
import { DEFAULT_VOICE_SETTINGS } from "@/services/wake-word.service";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
}

export function VoiceSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: VoiceSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/20 bg-[#060A14] p-6 shadow-2xl shadow-cyan-950/30 text-white space-y-6">
        {/* Cyber Corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#14233D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-wide text-white">
                Voice CEO Configuration
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Hands-free wake word, interruption, and privacy policies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#0E1A30] text-zinc-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5 text-xs max-h-[60vh] overflow-y-auto pr-1">
          {/* Wake Word Input */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#091120] border border-[#162744]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-200">Wake Word Phrase</label>
              <span className="text-[10px] font-mono text-cyan-400">Local Trigger</span>
            </div>
            <input
              type="text"
              value={settings.wakeWord}
              onChange={(e) => onUpdateSettings({ wakeWord: e.target.value })}
              placeholder="e.g. Hey ELMO"
              className="w-full px-3 py-2 rounded-lg bg-[#040810] border border-[#1C3050] text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
            <p className="text-[11px] text-zinc-400 leading-normal">
              Say this phrase naturally to activate ELMO hands-free (e.g. &ldquo;Hey ELMO&rdquo;).
            </p>
          </div>

          {/* Global Multilingual Voice Configuration */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#091120] border border-[#162744]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-200">Global Language Mode</label>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                AUTO DETECT (DEFAULT)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              ELMO automatically identifies your spoken language across 35+ global language families
              (Spanish, French, Japanese, Korean, Arabic, Hindi, Mandarin, Malay, Indonesian, and more)
              and responds directly in that language without manual selection.
            </p>
            <div className="pt-1">
              <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>ACTIVE: UNIVERSAL REALTIME DETECTION ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Settings Toggles */}
          <div className="space-y-3">
            {/* 1. Wake Word Detection */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#091120]/70 border border-[#162744]">
              <div>
                <div className="font-semibold text-zinc-200">Wake Word Detection</div>
                <div className="text-[11px] text-zinc-400">
                  Enable continuous ambient listening for the wake phrase
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ wakeWordDetection: !settings.wakeWordDetection })
                }
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                  settings.wakeWordDetection ? "bg-cyan-500 shadow-[0_0_10px_rgba(0,210,255,0.5)]" : "bg-[#14233D]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    settings.wakeWordDetection ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* 2. Auto Listen After Wake */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#091120]/70 border border-[#162744]">
              <div>
                <div className="font-semibold text-zinc-200">Auto Listen After Wake</div>
                <div className="text-[11px] text-zinc-400">
                  Open microphone immediately after &ldquo;Yes, I&apos;m listening&rdquo;
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ autoListenAfterWake: !settings.autoListenAfterWake })
                }
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                  settings.autoListenAfterWake ? "bg-cyan-500 shadow-[0_0_10px_rgba(0,210,255,0.5)]" : "bg-[#14233D]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    settings.autoListenAfterWake ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* 3. Voice Response */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#091120]/70 border border-[#162744]">
              <div>
                <div className="font-semibold text-zinc-200">Voice Response (TTS)</div>
                <div className="text-[11px] text-zinc-400">
                  Read ELMO executive responses aloud through speaker
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ voiceResponse: !settings.voiceResponse })
                }
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                  settings.voiceResponse ? "bg-cyan-500 shadow-[0_0_10px_rgba(0,210,255,0.5)]" : "bg-[#14233D]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    settings.voiceResponse ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* 4. Interrupt ELMO */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#091120]/70 border border-[#162744]">
              <div>
                <div className="font-semibold text-zinc-200">Interrupt ELMO</div>
                <div className="text-[11px] text-zinc-400">
                  Stop speech playback immediately when you speak &ldquo;Hey ELMO&rdquo;
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ interruptElmo: !settings.interruptElmo })
                }
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                  settings.interruptElmo ? "bg-cyan-500 shadow-[0_0_10px_rgba(0,210,255,0.5)]" : "bg-[#14233D]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    settings.interruptElmo ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* 5. Allow Background Listening */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#091120]/70 border border-[#162744]">
              <div>
                <div className="font-semibold text-zinc-200">Allow Background Listening</div>
                <div className="text-[11px] text-zinc-400">
                  Maintain wake-word detection while browser tab is active
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    allowBackgroundListening: !settings.allowBackgroundListening,
                  })
                }
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                  settings.allowBackgroundListening ? "bg-cyan-500 shadow-[0_0_10px_rgba(0,210,255,0.5)]" : "bg-[#14233D]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    settings.allowBackgroundListening ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Inactivity Timeout */}
            <div className="p-3.5 rounded-xl bg-[#091120]/70 border border-[#162744] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">
                  Conversation Window Timeout
                </span>
                <span className="font-mono text-cyan-400">
                  {settings.conversationTimeoutSeconds}s
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={settings.conversationTimeoutSeconds}
                onChange={(e) =>
                  onUpdateSettings({
                    conversationTimeoutSeconds: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-400">
                Time after an answer where you can speak follow-ups without repeating &ldquo;Hey ELMO&rdquo;.
              </p>
            </div>
          </div>

          {/* Privacy Transparency Box */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-2.5 text-cyan-200">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px]">
              <div className="font-semibold text-cyan-300">
                100% On-Device Privacy Architecture
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Wake-word matching runs locally inside your browser via client-side Web Speech.
                Zero audio is transmitted to Gemini or cloud servers during standby.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#14233D]">
          <button
            onClick={() => onUpdateSettings(DEFAULT_VOICE_SETTINGS)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#162744] hover:bg-[#0E1A30] text-zinc-400 hover:text-white transition-colors text-xs font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-mono font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 transition-all"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
