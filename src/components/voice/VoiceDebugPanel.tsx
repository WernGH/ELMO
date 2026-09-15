"use client";

import React, { useState, useEffect } from "react";
import { Activity, ChevronDown, ChevronUp, Cpu, Hash, MessageSquare, Radio, Shield, Sparkles, Terminal, Volume2 } from "lucide-react";
import { ELMOIntelligenceService, TurnTelemetry } from "@/services/elmo-intelligence.service";
import { cn } from "@/lib/utils";

interface VoiceDebugPanelProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function VoiceDebugPanel({ className, defaultExpanded = false }: VoiceDebugPanelProps) {
  const [telemetry, setTelemetry] = useState<TurnTelemetry | null>(() => {
    return ELMOIntelligenceService.getLatestTelemetry();
  });
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Subscribe to intelligence service telemetry
    const unsubscribe = ELMOIntelligenceService.subscribeTelemetry((newTelemetry) => {
      setTelemetry(newTelemetry);
    });

    // Also listen to DOM events in case triggered from another context
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TurnTelemetry>;
      if (customEvent.detail) {
        setTelemetry(customEvent.detail);
      }
    };

    window.addEventListener("elmo-turn-telemetry", handleCustomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener("elmo-turn-telemetry", handleCustomEvent);
    };
  }, []);

  const handleCopyConvId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (telemetry?.conversationId) {
      navigator.clipboard.writeText(telemetry.conversationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!telemetry) {
    // Render an idle badge when waiting for first interaction
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-cyan-500/20 bg-[#071120]/80 backdrop-blur-md text-[11px] font-mono text-cyan-400/70 select-none shadow-sm",
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50 animate-pulse" />
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">AI Brain:</span>
        <span className="text-zinc-300">Ready</span>
      </div>
    );
  }

  const isVoice = telemetry.inputMode === "voice";

  return (
    <div
      className={cn(
        "font-mono transition-all duration-200 z-40 select-none",
        className
      )}
    >
      {/* Collapsed Pill Badge */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-200 text-left group shadow-lg",
          isVoice
            ? "bg-[#0B1E38]/90 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.2)]"
            : "bg-[#071426]/90 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
          isExpanded && "ring-1 ring-cyan-400/50"
        )}
        title="Click to toggle ELMO Conversational Intelligence Telemetry"
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full animate-ping opacity-75",
              isVoice ? "bg-cyan-400" : "bg-emerald-400"
            )}
          />
          {isVoice ? (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          {telemetry.inputMode}
        </span>

        <span className="text-zinc-500">|</span>

        <span className="font-bold text-xs uppercase text-cyan-200">
          {telemetry.detectedLanguage}
        </span>

        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
          {(telemetry.confidence * 100).toFixed(0)}%
        </span>

        <span className="text-zinc-500 hidden sm:inline">|</span>

        <span className="text-[11px] text-zinc-300 truncate max-w-[120px] hidden sm:inline capitalize">
          {telemetry.intent.replace(/_/g, " ")}
        </span>

        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
        )}
      </button>

      {/* Expanded Diagnostic Card */}
      {isExpanded && (
        <div
          className="mt-2 w-[340px] sm:w-[420px] max-w-[95vw] rounded-2xl bg-[#040914]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(0,210,255,0.15)] p-4 text-xs animate-in fade-in zoom-in-95 duration-150 relative"
          role="region"
          aria-label="ELMO Turn Telemetry Diagnostics"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>ELMO Brain Telemetry</span>
            </div>
            <div className="flex items-center gap-2">
              {telemetry.latencyMs && (
                <span className="text-[10px] text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                  {telemetry.latencyMs}ms
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold uppercase">
                {telemetry.inputMode}
              </span>
            </div>
          </div>

          {/* Diagnostic Key-Values */}
          <div className="space-y-2 text-[11px]">
            {/* Conversation ID */}
            <div className="flex items-center justify-between bg-[#081224] p-2 rounded-lg border border-cyan-500/10">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Hash className="w-3 h-3 text-cyan-400" /> Conv ID:
              </span>
              <button
                type="button"
                onClick={handleCopyConvId}
                className="text-cyan-300 hover:text-cyan-100 hover:underline flex items-center gap-1 font-mono text-[10px]"
                title="Click to copy Conversation ID"
              >
                <span>{telemetry.conversationId.slice(0, 16)}...</span>
                {copied ? (
                  <span className="text-emerald-400 text-[9px] font-bold">COPIED</span>
                ) : (
                  <span className="text-zinc-500 text-[9px]">[COPY]</span>
                )}
              </button>
            </div>

            {/* Language & Confidence */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#081224] p-2 rounded-lg border border-cyan-500/10">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Detected Language</div>
                <div className="font-bold text-cyan-200 mt-0.5 flex items-center gap-1">
                  <span>{telemetry.languageName}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">({telemetry.languageCode})</span>
                </div>
              </div>

              <div className="bg-[#081224] p-2 rounded-lg border border-cyan-500/10">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Confidence</div>
                <div className="font-bold text-emerald-300 mt-0.5">
                  {(telemetry.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Intent */}
            <div className="bg-[#081224] p-2 rounded-lg border border-cyan-500/10">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Understood Intent</div>
              <div className="font-bold text-amber-300 mt-0.5 capitalize flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{telemetry.intent.replace(/_/g, " ")}</span>
              </div>
            </div>

            {/* User Input Snippet */}
            <div className="bg-[#081224] p-2.5 rounded-lg border border-cyan-500/10">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">User Input</div>
              <div className="text-zinc-200 font-sans italic line-clamp-2">
                &ldquo;{telemetry.userInput}&rdquo;
              </div>
            </div>

            {/* ELMO Response Snippet */}
            <div className="bg-[#081224] p-2.5 rounded-lg border border-cyan-500/10">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">ELMO Response</div>
              <div className="text-cyan-200/90 font-sans line-clamp-3">
                &ldquo;{telemetry.elmoResponse}&rdquo;
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
