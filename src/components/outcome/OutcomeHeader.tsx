import React from "react";
import { DesiredOutcome, DesiredOutcomeStatus } from "@/services/agentic/types/agentic.types";

interface OutcomeHeaderProps {
  outcome: DesiredOutcome;
  className?: string;
  onRefresh?: () => void;
}

export function OutcomeHeader({
  outcome,
  className = "",
  onRefresh,
}: OutcomeHeaderProps) {
  const getStatusBadge = (status: DesiredOutcomeStatus) => {
    switch (status) {
      case "ACHIEVED":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          dot: "bg-emerald-400",
          label: "Achieved",
          pulse: false,
        };
      case "PARTIALLY_ACHIEVED":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          dot: "bg-amber-400",
          label: "Partially Achieved",
          pulse: false,
        };
      case "EXECUTING":
        return {
          bg: "bg-[#00FF66]/10",
          border: "border-[#00FF66]/30",
          text: "text-[#00FF66]",
          dot: "bg-[#00FF66]",
          label: "Executing",
          pulse: true,
        };
      case "VERIFYING":
        return {
          bg: "bg-purple-500/10",
          border: "border-purple-500/30",
          text: "text-purple-400",
          dot: "bg-purple-400",
          label: "Verifying",
          pulse: true,
        };
      case "WAITING":
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/30",
          text: "text-yellow-400",
          dot: "bg-yellow-400",
          label: "Waiting for Approval",
          pulse: true,
        };
      case "BLOCKED":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/30",
          text: "text-rose-400",
          dot: "bg-rose-400",
          label: "Outcome Blocked",
          pulse: false,
        };
      case "FAILED":
      case "CANCELLED":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-400",
          dot: "bg-red-400",
          label: status === "CANCELLED" ? "Cancelled" : "Failed",
          pulse: false,
        };
      case "READY":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          dot: "bg-blue-400",
          label: "Workforce Ready",
          pulse: false,
        };
      case "UNDERSTANDING":
      default:
        return {
          bg: "bg-cyan-500/10",
          border: "border-cyan-500/30",
          text: "text-cyan-400",
          dot: "bg-cyan-400",
          label: "Understanding",
          pulse: true,
        };
    }
  };

  const statusConfig = getStatusBadge(outcome.status);
  const currentWorker = outcome.currentWorkerId || outcome.milestones.find((m) => m.status === "IN_PROGRESS")?.robotName || "ELMO";
  const verificationStatus = outcome.verification
    ? outcome.verification.verified
      ? "Passed"
      : "Partial / Failed"
    : outcome.status === "VERIFYING"
    ? "In Verification"
    : "Pending";

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Outcome Title & Status */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xl">🎯</span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight truncate">
              {outcome.title}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${statusConfig.dot} ${
                  statusConfig.pulse ? "animate-pulse" : ""
                }`}
              />
              <span>{statusConfig.label}</span>
            </span>
          </div>

          {outcome.description && (
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {outcome.description}
            </p>
          )}
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="self-start md:self-center p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white border border-slate-700 transition-colors text-xs flex items-center gap-1.5"
            title="Refresh Telemetry"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Grid of Section B2 Status Signals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
            Status
          </span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block">
            {outcome.status}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
            Current Phase
          </span>
          <span className="text-xs font-bold text-cyan-400 mt-0.5 block">
            {outcome.progressState || outcome.status}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
            Current Worker
          </span>
          <span className="text-xs font-bold text-emerald-400 mt-0.5 block flex items-center gap-1 truncate">
            <span>🤖</span>
            <span>{currentWorker}</span>
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
            Verification
          </span>
          <span
            className={`text-xs font-bold mt-0.5 block ${
              verificationStatus === "Passed"
                ? "text-emerald-400"
                : verificationStatus === "Pending"
                ? "text-slate-400"
                : "text-purple-400"
            }`}
          >
            {verificationStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
