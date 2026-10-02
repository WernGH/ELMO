import React from "react";
import { WorkerHandoffContract } from "@/services/agentic/types/agentic.types";

interface RobotHandoffProps {
  handoff?: WorkerHandoffContract | {
    toRobotId: string;
    toWorkerId: string;
    summary: string;
    timestamp: number;
    fromRobotName?: string;
    toRobotName?: string;
  };
  className?: string;
}

export function RobotHandoff({ handoff, className = "" }: RobotHandoffProps) {
  if (!handoff) {
    return (
      <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic ${className}`}>
        No active handoff recorded. Workers collaborate strictly through deterministic contracts.
      </div>
    );
  }

  // Handle both WorkerHandoffContract and RobotIdentity.handoffState
  const isFullContract = "fromWorkerId" in handoff;
  const fromName = isFullContract
    ? (handoff as WorkerHandoffContract).fromWorkerId.replace("-worker", "").toUpperCase()
    : (handoff as any).fromRobotName || "WORKER";
  const toName = isFullContract
    ? (handoff as WorkerHandoffContract).toWorkerId.replace("-worker", "").toUpperCase()
    : (handoff as any).toRobotName || (handoff as any).toWorkerId?.replace("-worker", "").toUpperCase() || "WORKER";

  const objective = isFullContract
    ? (handoff as WorkerHandoffContract).objective
    : (handoff as any).summary;
  const completedWork = isFullContract ? (handoff as WorkerHandoffContract).completedWork : undefined;
  const nextAction = isFullContract ? (handoff as WorkerHandoffContract).requiredNextAction : undefined;
  const evidence = isFullContract ? (handoff as WorkerHandoffContract).evidence : [];
  const status = isFullContract ? (handoff as WorkerHandoffContract).verificationStatus : "VERIFIED";

  return (
    <div className={`p-4 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-3 ${className}`}>
      {/* Route header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <span className="text-cyan-400">🤖 {fromName}</span>
          <span className="text-slate-500">→</span>
          <span className="text-emerald-400">🤖 {toName}</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          ✓ {status}
        </span>
      </div>

      {/* Summary / Objective */}
      <div>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
          Handoff Context & Objective
        </span>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800">
          {objective}
        </p>
      </div>

      {/* Completed work */}
      {completedWork && (
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Completed Work
          </span>
          <p className="text-xs text-slate-300 bg-slate-950/40 p-2 rounded border border-slate-800/60">
            {completedWork}
          </p>
        </div>
      )}

      {/* Required Next Action */}
      {nextAction && (
        <div>
          <span className="text-[10px] font-semibold text-cyan-400/90 uppercase tracking-wider block mb-1">
            Required Next Action
          </span>
          <p className="text-xs text-cyan-300 bg-cyan-950/20 p-2 rounded border border-cyan-900/30">
            {nextAction}
          </p>
        </div>
      )}

      {/* Evidence */}
      {evidence && evidence.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Verified Evidence ({evidence.length})
          </span>
          <ul className="space-y-1">
            {evidence.map((ev, idx) => (
              <li
                key={idx}
                className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80"
              >
                {ev}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>Deterministic Governance</span>
        <span>{new Date(handoff.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
}
