import React from "react";
import { DesiredOutcome, RobotIdentity } from "@/services/agentic/types/agentic.types";
import { RobotAvatar } from "../robot/RobotAvatar";

interface ElmoExecutivePanelProps {
  outcome?: DesiredOutcome;
  currentWorker?: RobotIdentity;
  nextWorkers?: string[];
  className?: string;
  onOpenOutcomeModal?: () => void;
}

export function ElmoExecutivePanel({
  outcome,
  currentWorker,
  nextWorkers = [],
  className = "",
  onOpenOutcomeModal,
}: ElmoExecutivePanelProps) {
  const currentWorkerDisplay = currentWorker
    ? currentWorker.displayName
    : outcome?.currentWorkerId || outcome?.milestones?.find((m) => m.status === "IN_PROGRESS")?.robotName || "STRATEGY";

  // Derive upcoming workers from pending milestones
  const upcoming = nextWorkers.length > 0
    ? nextWorkers
    : outcome?.milestones
        ?.filter((m) => m.status === "PENDING" && m.robotName && m.robotName !== "ELMO")
        ?.map((m) => m.robotName!) || [];

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-[0_0_30px_rgba(0,255,102,0.06)] relative overflow-hidden ${className}`}>
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        {/* ELMO Executive Identity */}
        <div className="flex items-center gap-3.5">
          <RobotAvatar
            avatarKey="elmo"
            displayName="ELMO"
            status={outcome?.status === "EXECUTING" ? "WORKING" : "READY"}
            size="lg"
            showStatusIndicator={true}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-wide flex items-center gap-1.5">
                <span>🤖</span>
                <span>ELMO</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                Executive Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervising outcome decomposition, specialist delegation, and acceptance verification.
            </p>
          </div>
        </div>

        {/* Primary Outcome Trigger Button */}
        {onOpenOutcomeModal && (
          <button
            onClick={onOpenOutcomeModal}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-[#00FF66] hover:bg-[#00e65c] text-black font-black text-xs tracking-wide shadow-[0_0_20px_rgba(0,255,102,0.3)] transition-all flex items-center gap-2 flex-shrink-0 active:scale-95"
          >
            <span>🎯</span>
            <span>State Business Outcome</span>
          </button>
        )}
      </div>

      {/* Live Executive Supervised State */}
      {outcome && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Supervised Outcome
            </span>
            <p className="text-xs font-bold text-slate-200 mt-1 truncate">
              {outcome.title}
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Outcome Status
            </span>
            <p className="text-xs font-bold text-[#00FF66] mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
              <span>{outcome.status}</span>
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Current Active Worker
            </span>
            <p className="text-xs font-bold text-cyan-400 mt-1 flex items-center gap-1 truncate">
              <span>🤖</span>
              <span>{currentWorkerDisplay}</span>
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Next In Pipeline
            </span>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {upcoming.length > 0 ? (
                upcoming.slice(0, 2).map((w, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    🤖 {w}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">None queued</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
