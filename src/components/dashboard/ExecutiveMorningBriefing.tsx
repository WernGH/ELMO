"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Bot,
  Flame,
  Volume2,
  VolumeX,
  CheckSquare,
  Square,
  Zap,
  HelpCircle,
  BarChart3,
  Users,
  Layers,
  Send,
  Loader2,
} from "lucide-react";
import { ExecutiveBriefing, ExecutivePriorityItem, TodayFocusItem } from "@/types/briefing.types";
import { ExecutiveBriefingService } from "@/services/executive-briefing.service";
import { TextToSpeechService } from "@/services/voice/tts.service";
import { cn } from "@/lib/utils";

export interface ExecutiveMorningBriefingProps {
  briefing: ExecutiveBriefing | null;
  userName?: string;
  organizationName?: string;
  userId: string;
  organizationId: string;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onAskELMO?: (prompt: string) => void;
  className?: string;
}

export function ExecutiveMorningBriefing({
  briefing,
  userName = "Commander",
  organizationName,
  userId,
  organizationId,
  isLoading = false,
  onRefresh,
  onAskELMO,
  className,
}: ExecutiveMorningBriefingProps) {
  // Audio playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const ttsRef = useRef<TextToSpeechService | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Action execution state
  const [executingActions, setExecutingActions] = useState<Record<string, boolean>>({});
  const [executedResults, setExecutedResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Today's focus completion state
  const [completedFocusIds, setCompletedFocusIds] = useState<Set<string>>(new Set());

  // Follow-up question input
  const [customQuestion, setCustomQuestion] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize TTS
  useEffect(() => {
    const tts = new TextToSpeechService();
    ttsRef.current = tts;

    const unsubStart = tts.onStart(() => {
      setIsPlayingAudio(true);
    });

    const unsubEnd = tts.onEnd(() => {
      setIsPlayingAudio(false);
      setAudioProgress(100);
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    });

    return () => {
      unsubStart();
      unsubEnd();
      tts.stop();
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, []);

  const handleToggleAudio = async () => {
    if (!briefing || !ttsRef.current) return;

    if (isPlayingAudio) {
      ttsRef.current.stop();
      setIsPlayingAudio(false);
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    } else {
      setIsPlayingAudio(true);
      setAudioProgress(0);

      // Estimate total spoken duration: ~130 words per minute
      const wordCount = briefing.spokenBriefing.split(/\s+/).length;
      const estimatedSeconds = Math.max(10, Math.round((wordCount / 130) * 60));

      const startTime = Date.now();
      audioIntervalRef.current = setInterval(() => {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const progress = Math.min(95, Math.round((elapsedSec / estimatedSeconds) * 100));
        setAudioProgress(progress);
      }, 500);

      try {
        await ttsRef.current.speak(briefing.spokenBriefing);
      } catch (err) {
        setIsPlayingAudio(false);
      }
    }
  };

  const handleManualRefresh = async () => {
    if (isRefreshing || !onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExecuteAction = async (itemId: string, item: ExecutivePriorityItem) => {
    if (!briefing || executingActions[itemId]) return;

    setExecutingActions((prev) => ({ ...prev, [itemId]: true }));

    try {
      const briefingService = ExecutiveBriefingService.getInstance();
      const payload = item.actionPayload || {
        type: "custom",
        parameters: { action: item.recommendedAction, sourceItem: item.id },
      };

      const result = await briefingService.executeBriefingAction({
        userId,
        organizationId,
        briefingId: briefing.id,
        actionPayload: payload,
        approvedByUser: true,
      });

      setExecutedResults((prev) => ({
        ...prev,
        [itemId]: {
          success: result.success,
          message: result.message || "Action dispatched to ELMO workforce.",
        },
      }));
    } catch (err: any) {
      setExecutedResults((prev) => ({
        ...prev,
        [itemId]: {
          success: false,
          message: err.message || "Failed to execute action.",
        },
      }));
    } finally {
      setExecutingActions((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const toggleFocusItem = (focusId: string) => {
    setCompletedFocusIds((prev) => {
      const next = new Set(prev);
      if (next.has(focusId)) {
        next.delete(focusId);
      } else {
        next.add(focusId);
      }
      return next;
    });
  };

  const handleAskQuestion = (q: string) => {
    if (!q.trim() || !onAskELMO) return;
    onAskELMO(q);
    setCustomQuestion("");
  };

  if (isLoading && !briefing) {
    return (
      <div className="rounded-3xl bg-[#060D1A]/95 border border-[#14233D] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center space-y-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-sm font-mono text-cyan-300">Synthesizing Executive Morning Briefing...</p>
        <p className="text-xs text-zinc-500 font-sans">
          Querying multi-tenant funnel analytics, workforce telemetry, and pipeline signals.
        </p>
      </div>
    );
  }

  if (!briefing) {
    return null;
  }

  // Format nice today date
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const attentionItems = briefing.priorityItems.filter(
    (p) => p.category === "ATTENTION_REQUIRED" || p.priority === "urgent" || p.priority === "high"
  );

  return (
    <div
      className={cn(
        "space-y-6 rounded-3xl bg-gradient-to-b from-[#060E1E]/95 via-[#040914]/95 to-[#02050B]/95 border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,210,255,0.1)] relative overflow-hidden backdrop-blur-xl",
        className
      )}
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================= */}
      {/* 1. HEADER: GREETING, DATE, FRESHNESS & AUDIO PLAYER       */}
      {/* ========================================================= */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#14233D]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              EXECUTIVE MORNING BRIEFING
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {organizationName || "Operations Control"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            GOOD MORNING, {userName.toUpperCase()}
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            {todayFormatted} • Briefing Period: {briefing.period.start} to {briefing.period.end}
          </p>
        </div>

        {/* Action Controls & Data Freshness */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Data Freshness Tag */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-xs font-mono"
            title={`Leads updated: ${briefing.dataFreshness.leadsLastUpdated} | Funnels: ${briefing.dataFreshness.funnelsLastUpdated}`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00D2FF]" />
            <span>
              {briefing.dataFreshness.isRealtime ? "LIVE TELEMETRY" : "FRESH DATA"}
            </span>
          </div>

          {/* Audio Listen Button */}
          <button
            onClick={handleToggleAudio}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-sm border",
              isPlayingAudio
                ? "bg-rose-950/80 border-rose-500/50 text-rose-300 hover:bg-rose-900"
                : "bg-[#09152B] border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/50 hover:text-white"
            )}
            title="Listen to synthesized executive audio briefing"
          >
            {isPlayingAudio ? (
              <>
                <Pause className="w-3.5 h-3.5 text-rose-300" />
                <span>PAUSE AUDIO</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>LISTEN TO BRIEFING</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 rounded-xl bg-[#09152B] border border-[#182C4E] hover:border-cyan-400/50 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            title="Force recalculate today's briefing"
          >
            <RefreshCw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin text-cyan-400")} />
          </button>
        </div>
      </div>

      {/* Spoken Briefing Audio Bar (Shows when audio playing or active) */}
      {isPlayingAudio && (
        <div className="relative z-10 p-3.5 rounded-2xl bg-[#081224] border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-white">Voice Briefing in Progress</p>
              <p className="text-[11px] text-zinc-400 font-sans line-clamp-1 max-w-md">
                {briefing.spokenBriefing}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-48">
            <div className="flex-1 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{audioProgress}%</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BUSINESS SNAPSHOT (4 METRICS GRID WITH 24H DELTAS)     */}
      {/* ========================================================= */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: New Leads */}
        <div className="p-4 rounded-2xl bg-[#070E1C] border border-[#14233D] hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>NEW LEADS (24H)</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white font-mono">
              {briefing.businessSnapshot.newLeadsCount}
            </span>
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md",
                briefing.businessSnapshot.leadVolumeChange.trend === "up"
                  ? "text-emerald-400 bg-emerald-950/40 border border-emerald-500/30"
                  : briefing.businessSnapshot.leadVolumeChange.trend === "down"
                  ? "text-rose-400 bg-rose-950/40 border border-rose-500/30"
                  : "text-zinc-400 bg-zinc-800"
              )}
            >
              {briefing.businessSnapshot.leadVolumeChange.trend === "up" && (
                <TrendingUp className="w-3 h-3" />
              )}
              {briefing.businessSnapshot.leadVolumeChange.trend === "down" && (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>
                {briefing.businessSnapshot.leadVolumeChange.percentChange !== null
                  ? `${briefing.businessSnapshot.leadVolumeChange.percentChange > 0 ? "+" : ""}${briefing.businessSnapshot.leadVolumeChange.percentChange}%`
                  : "Steady"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 font-sans">
            Total in period: {briefing.businessSnapshot.leadVolumeChange.current} leads
          </p>
        </div>

        {/* Metric 2: Contacts Pipeline */}
        <div className="p-4 rounded-2xl bg-[#070E1C] border border-[#14233D] hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>NEW CONTACTS</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white font-mono">
              {briefing.businessSnapshot.newContactsCount}
            </span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
              {briefing.businessSnapshot.importantContactActivity.length} Active events
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 font-sans">
            CRM database active pipeline
          </p>
        </div>

        {/* Metric 3: Funnel Conversion Rate */}
        <div className="p-4 rounded-2xl bg-[#070E1C] border border-[#14233D] hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>CONVERSION RATE</span>
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white font-mono">
              {briefing.businessSnapshot.conversionChange.currentRate}%
            </span>
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md",
                briefing.businessSnapshot.conversionChange.trend === "up"
                  ? "text-emerald-400 bg-emerald-950/40 border border-emerald-500/30"
                  : briefing.businessSnapshot.conversionChange.trend === "down"
                  ? "text-rose-400 bg-rose-950/40 border border-rose-500/30"
                  : "text-zinc-400 bg-zinc-800"
              )}
            >
              {briefing.businessSnapshot.conversionChange.trend === "up" && (
                <TrendingUp className="w-3 h-3" />
              )}
              {briefing.businessSnapshot.conversionChange.trend === "down" && (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>
                {briefing.businessSnapshot.conversionChange.rateDifference !== 0
                  ? `${briefing.businessSnapshot.conversionChange.rateDifference > 0 ? "+" : ""}${briefing.businessSnapshot.conversionChange.rateDifference}%`
                  : "Par"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 font-sans">
            vs Previous Period ({briefing.businessSnapshot.conversionChange.previousRate}%)
          </p>
        </div>

        {/* Metric 4: Active Funnels */}
        <div className="p-4 rounded-2xl bg-[#070E1C] border border-[#14233D] hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>ACTIVE FUNNELS</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white font-mono">
              {briefing.funnelHealth.activeFunnels.length}
            </span>
            <span
              className={cn(
                "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border",
                briefing.funnelHealth.overallConversionHealth === "healthy"
                  ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/30"
                  : briefing.funnelHealth.overallConversionHealth === "warning"
                  ? "text-amber-400 border-amber-500/40 bg-amber-950/30"
                  : briefing.funnelHealth.overallConversionHealth === "critical"
                  ? "text-rose-400 border-rose-500/40 bg-rose-950/30"
                  : "text-zinc-400 border-zinc-700 bg-zinc-900"
              )}
            >
              {briefing.funnelHealth.overallConversionHealth.replace("_", " ")}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 font-sans">
            {briefing.businessSnapshot.funnelActivity.totalViews} views • {briefing.businessSnapshot.funnelActivity.totalConversions} conv
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. ATTENTION REQUIRED: "WHY IT MATTERS" 3-PART FRAMEWORK  */}
      {/* ========================================================= */}
      {attentionItems.length > 0 && (
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                ATTENTION REQUIRED // WHY IT MATTERS
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {attentionItems.length} critical {attentionItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attentionItems.map((item) => {
              const isExecuting = executingActions[item.id];
              const result = executedResults[item.id];

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#081222] border border-amber-500/30 hover:border-amber-500/60 transition-all flex flex-col justify-between space-y-4 shadow-lg shadow-black/40"
                >
                  <div className="space-y-3">
                    {/* Header tags */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border",
                          item.priority === "urgent"
                            ? "bg-rose-950/50 border-rose-500/50 text-rose-300"
                            : "bg-amber-950/50 border-amber-500/50 text-amber-300"
                        )}
                      >
                        {item.priority} PRIORITY
                      </span>
                      {item.requiresApproval && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/50 border border-blue-500/40 text-blue-300">
                          HUMAN APPROVAL REQUIRED
                        </span>
                      )}
                    </div>

                    {/* 3-Part Framework: Fact, Analysis, Next Steps */}
                    <div className="space-y-2.5">
                      {/* 1. What Happened */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                          1. WHAT HAPPENED:
                        </span>
                        <p className="text-xs text-white font-medium leading-relaxed">
                          {item.whatHappened}
                        </p>
                      </div>

                      {/* 2. Why It Matters */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                          2. WHY IT MATTERS:
                        </span>
                        <p className="text-xs text-cyan-100/90 font-sans leading-relaxed">
                          {item.whyItMatters}
                        </p>
                      </div>

                      {/* 3. Recommended Action */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                          3. RECOMMENDED ACTION:
                        </span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {item.recommendedAction}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Action Execution Button */}
                  <div className="pt-2 border-t border-[#162947]">
                    {result ? (
                      <div
                        className={cn(
                          "p-2.5 rounded-xl text-xs font-mono flex items-center gap-2",
                          result.success
                            ? "bg-emerald-950/40 border border-emerald-500/40 text-emerald-300"
                            : "bg-rose-950/40 border border-rose-500/40 text-rose-300"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{result.message}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleExecuteAction(item.id, item)}
                        disabled={isExecuting}
                        className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>DISPATCHING TO ELMO...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>I CAN HANDLE THIS — EXECUTE</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TODAY'S FOCUS & AI WORKFORCE STATUS SPLIT              */}
      {/* ========================================================= */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Today's Focus Checklist (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#060D1A] border border-[#14233D] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#14233D]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                TODAY&apos;S FOCUS // TOP PRIORITIES
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              {completedFocusIds.size}/{briefing.todayFocus.length} Done
            </span>
          </div>

          <div className="space-y-2.5">
            {briefing.todayFocus.map((focus, idx) => {
              const isDone = completedFocusIds.has(focus.id);
              const isExecuting = executingActions[focus.id];
              const result = executedResults[focus.id];

              return (
                <div
                  key={focus.id}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3",
                    isDone
                      ? "bg-zinc-900/40 border-zinc-800 opacity-60"
                      : "bg-[#0A1424] border-[#182C4E] hover:border-cyan-500/40"
                  )}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleFocusItem(focus.id)}
                      className="mt-0.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                      title="Toggle completion"
                    >
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          #{focus.order || idx + 1}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold text-white",
                            isDone && "line-through text-zinc-500"
                          )}
                        >
                          {focus.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-zinc-800 text-zinc-400">
                          {focus.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        {focus.reason}
                      </p>
                    </div>
                  </div>

                  {focus.canElmoHandle && !isDone && (
                    <div className="shrink-0">
                      {result ? (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
                          Dispatched
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            handleExecuteAction(focus.id, {
                              id: focus.id,
                              priority: "high",
                              category: "ATTENTION_REQUIRED",
                              severity: "warning",
                              businessImpact: focus.reason,
                              source: "today_focus",
                              timestamp: Date.now(),
                              whatHappened: focus.title,
                              whyItMatters: focus.reason,
                              recommendedAction: focus.suggestedAction || focus.title,
                              requiresApproval: focus.requiresApproval,
                              actionPayload: focus.actionPayload,
                            })
                          }
                          disabled={isExecuting}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-[10px] font-mono font-semibold text-cyan-300 hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5"
                          title="Delegate this task to ELMO AI Workforce"
                        >
                          {isExecuting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Bot className="w-3 h-3 text-cyan-400" />
                          )}
                          <span>Delegate</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: AI Workforce & Approvals (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#060D1A] border border-[#14233D] space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#14233D]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  AI WORKFORCE TELEMETRY
                </h2>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                {briefing.workforceSummary.agents.length} Agents
              </span>
            </div>

            {/* Workforce summary cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0A1424] border border-[#162A48]">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">EXECUTING TASKS</span>
                <p className="text-lg font-mono font-bold text-cyan-300 mt-1">
                  {briefing.workforceSummary.totalExecuting}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#0A1424] border border-[#162A48]">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">COMPLETED</span>
                <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {briefing.workforceSummary.totalCompleted}
                </p>
              </div>
            </div>

            {/* Pending Approvals Callout */}
            {briefing.workStatus.pendingApprovals.length > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-300 font-mono text-xs font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{briefing.workStatus.pendingApprovals.length} PENDING APPROVALS</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                    Action Required
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 font-sans line-clamp-2">
                  High impact actions require human authorization before autonomous execution continues.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#0A1424] border border-[#162A48] flex items-center gap-2 text-xs font-mono text-zinc-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero pending approval bottlenecks.</span>
              </div>
            )}
          </div>

          {/* ELMO Quick Recommendations */}
          {briefing.recommendations.length > 0 && (
            <div className="pt-3 border-t border-[#14233D] space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                ELMO STRATEGIC RECOMMENDATION:
              </span>
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/30 to-[#0A1424] border border-cyan-500/30">
                <p className="text-xs font-bold text-white">
                  {briefing.recommendations[0].title}
                </p>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  {briefing.recommendations[0].description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. INTERACTIVE FOLLOW-UP PROMPT CHIPS & ASK ELMO INPUT    */}
      {/* ========================================================= */}
      <div className="relative z-10 p-4 rounded-2xl bg-[#060D1A] border border-[#14233D] space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            DRILL DOWN INTO THIS BRIEFING
          </span>
        </div>

        {/* Quick Question Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            "Tell me more about the leads",
            "Which funnel is performing worst?",
            "Why did conversion drop?",
            "Show me high-priority leads",
            "What should I do first?",
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(prompt)}
              className="px-3 py-1.5 rounded-xl bg-[#09152B] border border-[#182C4E] hover:border-cyan-400/50 hover:bg-[#0E2040] text-xs font-mono text-zinc-300 hover:text-white transition-all text-left flex items-center gap-1.5"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </button>
          ))}
        </div>

        {/* Custom Question Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion(customQuestion);
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Ask ELMO anything about today's morning briefing..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#081224] border border-[#182C4E] focus:border-cyan-400 focus:outline-none text-xs font-sans text-white placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={!customQuestion.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-black font-mono font-bold text-xs flex items-center gap-1.5 hover:brightness-110 disabled:opacity-40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask ELMO</span>
          </button>
        </form>
      </div>
    </div>
  );
}
