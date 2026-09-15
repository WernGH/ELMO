"use client";

import React, { useRef, useEffect } from "react";
import {
  Radio,
  User,
  Bot,
  Sparkles,
  Zap,
  Volume2,
  Square,
  MessageSquare,
  ChevronDown,
  Clock,
  Send,
} from "lucide-react";
import { VoiceState } from "@/services/voice/voice.types";
import { VoiceControlsPanel } from "./VoiceControlsPanel";
import { cn } from "@/lib/utils";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  timestamp?: string;
}

interface LiveConversationPanelProps {
  messages: ConversationMessage[];
  voiceState: VoiceState;
  liveTranscript?: string;
  isVoiceActive: boolean;
  isPaused: boolean;
  micPermission: string;
  onToggleVoiceMode: () => void;
  onPauseVoiceMode: () => void;
  onResumeVoiceMode: () => void;
  onInterrupt: () => void;
  onToggleManualMic?: () => void;
  onSendMessage?: (text: string) => void;
  className?: string;
}

export function LiveConversationPanel({
  messages,
  voiceState,
  liveTranscript = "",
  isVoiceActive,
  isPaused,
  micPermission,
  onToggleVoiceMode,
  onPauseVoiceMode,
  onResumeVoiceMode,
  onInterrupt,
  onToggleManualMic,
  onSendMessage,
  className,
}: LiveConversationPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [inputText, setInputText] = React.useState("");
  const [showControls, setShowControls] = React.useState(true);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (onSendMessage) {
      onSendMessage(inputText.trim());
    }
    setInputText("");
  };

  const isSpeaking = voiceState === "ELMO_SPEAKING";
  const isListening = voiceState === "LISTENING" || voiceState === "USER_SPEAKING";
  const isProcessing = voiceState === "PROCESSING";
  const isInterrupted = voiceState === "INTERRUPTED";

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl bg-[#060D1A]/95 border border-[#14233D] shadow-2xl relative overflow-hidden backdrop-blur-xl",
        className
      )}
    >
      {/* Cyber Corner Marks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-10" />

      {/* Header */}
      <div className="p-4 border-b border-[#14233D] bg-[#050A14]/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isVoiceActive ? "bg-cyan-400" : "bg-zinc-500"
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5 shadow-[0_0_8px_#00D2FF]",
                isVoiceActive ? "bg-cyan-400" : "bg-zinc-500"
              )}
            />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>LIVE CONVERSATION</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/30">
                AI STREAM
              </span>
            </h2>
            <p className="text-[10px] font-mono text-zinc-400">
              {isVoiceActive
                ? isPaused
                  ? "VOICE PAUSED // TAP RESUME"
                  : "CONTINUOUS VOICE ACTIVE // NO WAKE WORD"
                : "VOICE ENGINE STANDBY"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={onInterrupt}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-all flex items-center gap-1 shadow-[0_0_12px_rgba(0,210,255,0.6)] animate-pulse"
              title="Interrupt ELMO instantly (Barge-in)"
            >
              <Zap className="w-3 h-3" />
              INTERRUPT
            </button>
          )}

          <button
            onClick={() => setShowControls(!showControls)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-[#0C172B] border border-transparent hover:border-[#1E3557] transition-colors"
            title="Toggle voice controls drawer"
          >
            <ChevronDown
              className={cn("w-4 h-4 transition-transform duration-200", showControls && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* State Status Banner Ribbon */}
      <div
        className={cn(
          "px-4 py-2 text-xs font-mono border-b flex items-center justify-between transition-colors shrink-0",
          isInterrupted
            ? "bg-cyan-950/60 border-cyan-400/60 text-cyan-200"
            : isSpeaking
            ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
            : isProcessing
            ? "bg-blue-950/40 border-blue-500/40 text-blue-300"
            : isListening
            ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-400"
            : "bg-[#060D1A] border-[#14233D] text-zinc-500"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-current">
            {voiceState}
          </span>
          <span className="text-[11px] truncate">
            {isInterrupted && "Barge-in signal detected — listening to your directive..."}
            {isSpeaking && "ELMO speaking — talk anytime to interrupt"}
            {isProcessing && "Synthesizing executive response via Gemini..."}
            {voiceState === "USER_SPEAKING" && "Capturing your voice stream..."}
            {voiceState === "LISTENING" && "Listening naturally — speak when ready"}
            {voiceState === "STANDBY" && "Voice mode off. Click Start Voice Mode to talk"}
            {voiceState === "ERROR" && "Voice engine error — fallback to text available"}
          </span>
        </div>

        {isSpeaking && (
          <div className="flex items-center gap-0.5">
            <span className="w-1 h-3 bg-cyan-400 animate-pulse" />
            <span className="w-1 h-4 bg-cyan-400 animate-pulse delay-75" />
            <span className="w-1 h-2 bg-cyan-400 animate-pulse delay-150" />
          </div>
        )}
      </div>

      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-[#121E33]">
        {messages.length === 0 && !liveTranscript ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.2)]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Awaiting Directives
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-xs font-sans leading-relaxed">
                Activate Voice Mode to talk continuously without wake words. Or try these prompts:
              </p>
            </div>
            <div className="space-y-1.5 w-full max-w-xs text-left">
              {[
                "What is our active lead count?",
                "Give me an executive briefing on tasks.",
                "Are all AI systems operating normally?",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage && onSendMessage(suggestion)}
                  className="w-full px-3 py-2 rounded-xl bg-[#091120] border border-[#162947] hover:border-cyan-400/50 text-[11px] text-zinc-300 hover:text-cyan-200 text-left transition-colors font-sans flex items-center justify-between group"
                >
                  <span className="truncate">&ldquo;{suggestion}&rdquo;</span>
                  <Sparkles className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[88%] space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200",
                    isAssistant ? "mr-auto items-start" : "ml-auto items-end"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 px-1">
                    {isAssistant ? (
                      <>
                        <Bot className="w-3 h-3 text-cyan-400" />
                        <span className="font-bold text-cyan-400">ELMO</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 text-blue-400" />
                        <span className="font-bold text-blue-300">OPERATOR</span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      {msg.timestamp ||
                        (msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Now")}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl text-xs font-sans leading-relaxed relative",
                      isAssistant
                        ? "bg-[#091428] border border-cyan-500/30 text-zinc-100 rounded-tl-none shadow-[0_0_15px_rgba(0,210,255,0.08)]"
                        : "bg-gradient-to-r from-blue-900/60 to-cyan-900/40 border border-blue-400/40 text-white rounded-tr-none shadow-[0_0_15px_rgba(0,132,255,0.12)]"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Interim Transcript */}
            {liveTranscript && (
              <div className="flex flex-col max-w-[88%] ml-auto items-end space-y-1 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 px-1">
                  <User className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span className="font-bold">OPERATOR // SPEAKING...</span>
                </div>
                <div className="p-3.5 rounded-2xl text-xs font-sans leading-relaxed bg-[#0A1830] border border-cyan-400/60 text-cyan-200 rounded-tr-none shadow-[0_0_20px_rgba(0,210,255,0.25)] flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                  </span>
                  <span>{liveTranscript}</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Controls Collapsible Section */}
      {showControls && (
        <div className="border-t border-[#14233D] bg-[#050A14] shrink-0">
          <VoiceControlsPanel
            voiceState={voiceState}
            isVoiceActive={isVoiceActive}
            isPaused={isPaused}
            micPermission={micPermission}
            onToggleVoiceMode={onToggleVoiceMode}
            onPauseVoiceMode={onPauseVoiceMode}
            onResumeVoiceMode={onResumeVoiceMode}
            onToggleManualMic={onToggleManualMic}
            onStopSpeaking={onInterrupt}
            className="rounded-none border-x-0 border-b-0 p-3.5 bg-transparent"
          />
        </div>
      )}

      {/* Fallback Text Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[#14233D] bg-[#050A14]/90 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isVoiceActive
              ? "Voice mode active — or type a directive here..."
              : "Type a directive for ELMO..."
          }
          className="flex-1 px-3 py-2 rounded-xl bg-[#091120] border border-[#162744] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors font-sans"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-black font-bold text-xs hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,210,255,0.3)] flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono">SEND</span>
        </button>
      </form>
    </div>
  );
}
