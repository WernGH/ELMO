import React from "react";
import { RobotToolUsage } from "@/services/agentic/types/agentic.types";

interface RobotToolActivityProps {
  tools?: RobotToolUsage[];
  robotName?: string;
  className?: string;
}

export function RobotToolActivity({
  tools = [],
  robotName = "Robot",
  className = "",
}: RobotToolActivityProps) {
  if (!tools || tools.length === 0) {
    return (
      <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic ${className}`}>
        No active tool invocations. All tools remain capability-governed.
      </div>
    );
  }

  const getStatusBadge = (status: RobotToolUsage["status"]) => {
    switch (status) {
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Running
          </span>
        );
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Completed
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Failed
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Blocked
          </span>
        );
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {tools.map((t, idx) => (
        <div
          key={`${t.toolId}-${t.timestamp}-${idx}`}
          className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">🛠</span>
              <span className="font-semibold text-slate-200">{t.toolName}</span>
            </div>
            {getStatusBadge(t.status)}
          </div>

          {t.sanitizedSummary && (
            <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80 font-mono">
              {t.sanitizedSummary}
            </p>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span>Executed by {robotName}</span>
            <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
