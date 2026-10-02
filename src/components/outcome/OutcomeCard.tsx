"use client";

import React from "react";
import { DesiredOutcome, DesiredOutcomeStatus } from "@/services/agentic/types/agentic.types";
import {
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileText,
  AlertCircle,
} from "lucide-react";

interface OutcomeCardProps {
  outcome: DesiredOutcome;
  onStartExecution?: (outcomeId: string) => void;
  onApprove?: (outcomeId: string) => void;
  onReject?: (outcomeId: string) => void;
  onInspectArtifact?: (artifactId: string) => void;
  className?: string;
}

export const OutcomeCard: React.FC<OutcomeCardProps> = ({
  outcome,
  onStartExecution,
  onApprove,
  onReject,
  onInspectArtifact,
  className = "",
}) => {
  const getStatusBadge = (status: DesiredOutcomeStatus) => {
    switch (status) {
      case "ACHIEVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-[#00FF66] border border-[#00FF66]/30 shadow-[0_0_12px_rgba(0,255,102,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
            ✓ Achieved
          </span>
        );
      case "PARTIALLY_ACHIEVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
            🟡 Partially Achieved
          </span>
        );
      case "EXECUTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
            ● Executing
          </span>
        );
      case "VERIFYING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 animate-pulse">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verifying
          </span>
        );
      case "WAITING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            ⏸ Awaiting Approval
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            ⚠ Blocked
          </span>
        );
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Ready to Execute
          </span>
        );
      case "UNDERSTANDING":
      case "PLANNING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  const completedMilestones = outcome.milestones.filter((m) => m.status === "COMPLETED").length;
  const totalMilestones = outcome.milestones.length;

  return (
    <div
      className={`relative rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-xl space-y-6 ${className}`}
    >
      {/* Top Banner: Desired Outcome Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Target className="w-4 h-4 text-[#00FF66]" />
            🎯 Desired Outcome
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {outcome.title}
          </h2>
          {outcome.description && (
            <p className="text-sm text-zinc-400">{outcome.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(outcome.status)}
          {outcome.status === "READY" && onStartExecution && (
            <button
              onClick={() => onStartExecution(outcome.outcomeId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00FF66] hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,255,102,0.3)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch Workforce
            </button>
          )}
        </div>
      </div>

      {/* Target Metric vs Real Current Data (if applicable) */}
      {outcome.targetMetric && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Target Metric</span>
            <div className="text-lg font-bold text-white mt-0.5">
              {outcome.targetMetric.name}
            </div>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">Target Goal</span>
            <div className="text-lg font-bold text-[#00FF66] mt-0.5">
              {outcome.targetMetric.targetValue}
            </div>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">Current Telemetry</span>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">
              {outcome.targetMetric.currentValue !== undefined
                ? outcome.targetMetric.currentValue
                : "Tracking in progress..."}
            </div>
          </div>
        </div>
      )}

      {/* Success Criteria Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Success Criteria
        </h4>
        <ul className="space-y-1.5">
          {outcome.successCriteria.map((criterion, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-zinc-200">
              <span className="text-[#00FF66] font-bold">•</span>
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Real Milestone Progress */}
      <div className="space-y-2.5 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">
            Workforce Milestones ({completedMilestones}/{totalMilestones})
          </span>
          <span className="text-zinc-500 font-mono">
            {completedMilestones === totalMilestones
              ? "All milestones completed"
              : `${totalMilestones - completedMilestones} remaining`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {outcome.milestones.map((ms) => (
            <div
              key={ms.id}
              className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                ms.status === "COMPLETED"
                  ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                  : ms.status === "IN_PROGRESS"
                  ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-300 animate-pulse"
                  : ms.status === "BLOCKED"
                  ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
              }`}
            >
              {ms.status === "COMPLETED" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66] shrink-0" />
              ) : ms.status === "IN_PROGRESS" ? (
                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              ) : ms.status === "BLOCKED" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
              )}
              <span className="truncate font-medium">{ms.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Blocker Alert (Transparent, No Fake Success) */}
      {outcome.status === "BLOCKED" && outcome.blocker && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Execution Blocked: {outcome.blocker.reason}
          </div>
          {outcome.blocker.whatCompleted?.length > 0 && (
            <div>
              <span className="text-zinc-400 font-medium">What ELMO Completed:</span>
              <ul className="list-disc list-inside text-zinc-300 pl-1 mt-0.5">
                {outcome.blocker.whatCompleted.map((c, idx) => (
                  <li key={idx}>✓ {c}</li>
                ))}
              </ul>
            </div>
          )}
          {outcome.blocker.whatIsMissing?.length > 0 && (
            <div>
              <span className="text-rose-400 font-medium">What is Missing:</span>
              <ul className="list-disc list-inside text-rose-200 pl-1 mt-0.5">
                {outcome.blocker.whatIsMissing.map((m, idx) => (
                  <li key={idx}>✗ {m}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-2 border-t border-rose-500/20 text-white font-medium">
            Next Action: <span className="text-rose-300">{outcome.blocker.nextAction}</span>
          </div>
        </div>
      )}

      {/* Human Approval Gate */}
      {outcome.status === "WAITING" && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h5 className="text-sm font-bold text-white">Human Approval Required</h5>
              <p className="text-xs text-zinc-300">
                AI prepared the action plan. Human authority is required before executing high-impact operations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onApprove && (
              <button
                onClick={() => onApprove(outcome.outcomeId)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors"
              >
                Approve
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(outcome.outcomeId)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
              >
                Reject
              </button>
            )}
          </div>
        </div>
      )}

      {/* Attached Work Products / Artifacts */}
      {outcome.artifacts?.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Outcome Artifacts ({outcome.artifacts.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {outcome.artifacts.map((art) => (
              <button
                key={art.artifactId}
                onClick={() => onInspectArtifact?.(art.artifactId)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-white transition-colors"
              >
                <span>📦</span>
                <span className="font-medium truncate max-w-xs">{art.title}</span>
                <span className="text-[10px] text-emerald-400 uppercase font-mono">
                  {art.version ? `v${art.version}` : "v1"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
