import React from "react";
import { OutcomeMilestone, WorkerActivityRecord, RobotMessage } from "@/services/agentic/types/agentic.types";

interface ExecutionTimelineProps {
  milestones?: OutcomeMilestone[];
  activities?: WorkerActivityRecord[];
  messages?: RobotMessage[];
  className?: string;
}

export function ExecutionTimeline({
  milestones = [],
  activities = [],
  messages = [],
  className = "",
}: ExecutionTimelineProps) {
  // Derive timeline steps from milestones
  const steps = milestones.map((m) => {
    const isCompleted = m.status === "COMPLETED";
    const isInProgress = m.status === "IN_PROGRESS";
    const isBlocked = m.status === "BLOCKED";
    const isPending = m.status === "PENDING";

    let icon = "○";
    let statusClass = "text-slate-500 border-slate-700 bg-slate-900";
    let textClass = "text-slate-400";

    if (isCompleted) {
      icon = "✓";
      statusClass = "text-emerald-400 border-emerald-500/40 bg-emerald-950/40";
      textClass = "text-slate-200 font-medium";
    } else if (isInProgress) {
      icon = "●";
      statusClass = "text-cyan-400 border-cyan-500/50 bg-cyan-950/40 animate-pulse";
      textClass = "text-cyan-300 font-bold";
    } else if (isBlocked) {
      icon = "✗";
      statusClass = "text-rose-400 border-rose-500/40 bg-rose-950/40";
      textClass = "text-rose-300 font-semibold";
    }

    return {
      id: m.id,
      title: m.title,
      robotName: m.robotName,
      status: m.status,
      completedAt: m.completedAt,
      icon,
      statusClass,
      textClass,
    };
  });

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⏱️</span>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Execution Timeline (Real-Time DAG)
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Generated from Events
        </span>
      </div>

      {steps.length === 0 ? (
        <p className="text-xs text-slate-500 italic p-4 text-center">
          Timeline will populate as milestones are dynamically formulated.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {steps.map((step) => (
            <div key={step.id} className="relative flex items-start gap-3">
              <span
                className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${step.statusClass}`}
              >
                {step.icon}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs ${step.textClass}`}>
                    {step.title}
                  </span>
                  {step.robotName && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      🤖 {step.robotName}
                    </span>
                  )}
                  {step.status === "IN_PROGRESS" && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      LIVE
                    </span>
                  )}
                </div>

                {step.completedAt && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Completed at {new Date(step.completedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
