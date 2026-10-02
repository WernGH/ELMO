import React from "react";
import { RobotStatus as RobotStatusType, RobotWorkingPhase } from "@/services/agentic/types/agentic.types";

interface RobotStatusProps {
  status: RobotStatusType;
  workingPhase?: RobotWorkingPhase;
  compact?: boolean;
  className?: string;
}

export function RobotStatus({
  status,
  workingPhase,
  compact = false,
  className = "",
}: RobotStatusProps) {
  const getStatusConfig = (s: RobotStatusType) => {
    switch (s) {
      case "READY":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          dot: "bg-emerald-400",
          label: "Ready",
          pulse: false,
        };
      case "THINKING":
        return {
          bg: "bg-purple-500/10",
          border: "border-purple-500/30",
          text: "text-purple-400",
          dot: "bg-purple-400",
          label: "Thinking",
          pulse: true,
        };
      case "WORKING":
        return {
          bg: "bg-cyan-500/10",
          border: "border-cyan-500/30",
          text: "text-cyan-400",
          dot: "bg-cyan-400",
          label: "Working",
          pulse: true,
        };
      case "USING_TOOL":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          dot: "bg-blue-400",
          label: "Using Tool",
          pulse: true,
        };
      case "WAITING":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          dot: "bg-amber-400",
          label: "Waiting",
          pulse: false,
        };
      case "VERIFYING":
        return {
          bg: "bg-indigo-500/10",
          border: "border-indigo-500/30",
          text: "text-indigo-400",
          dot: "bg-indigo-400",
          label: "Verifying",
          pulse: true,
        };
      case "COMPLETE":
      case "COMPLETED":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          text: "text-green-400",
          dot: "bg-green-400",
          label: "Completed",
          pulse: false,
        };
      case "BLOCKED":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/30",
          text: "text-rose-400",
          dot: "bg-rose-400",
          label: "Blocked",
          pulse: false,
        };
      case "APPROVAL_REQUIRED":
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/30",
          text: "text-yellow-400",
          dot: "bg-yellow-400",
          label: "Approval Required",
          pulse: true,
        };
      case "ERROR":
      default:
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-400",
          dot: "bg-red-400",
          label: "Error",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig(status);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.border} ${config.text} ${className}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${config.dot} ${
            config.pulse ? "animate-pulse" : ""
          }`}
        />
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.bg} ${config.border} ${config.text}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${config.dot} ${
            config.pulse ? "animate-pulse" : ""
          }`}
        />
        <span>{config.label}</span>
      </span>
      {workingPhase && workingPhase !== "IDLE" && (
        <span className="text-xs text-slate-400 font-mono tracking-wide">
          ({workingPhase.replace(/_/g, " ")})
        </span>
      )}
    </div>
  );
}
