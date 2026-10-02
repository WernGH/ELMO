import React from "react";
import { DesiredOutcome } from "@/services/agentic/types/agentic.types";

interface OutcomeSuccessCriteriaProps {
  outcome: DesiredOutcome;
  className?: string;
}

export function OutcomeSuccessCriteria({
  outcome,
  className = "",
}: OutcomeSuccessCriteriaProps) {
  const metric = outcome.targetMetric;

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Success Criteria & Measurable Targets
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Governed Acceptance
        </span>
      </div>

      {/* Target Metric Section if specified */}
      {metric ? (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Target
              </span>
              <p className="text-sm font-black text-emerald-400 mt-0.5">
                {metric.targetValue}
              </p>
              <span className="text-[10px] text-slate-400 truncate block">
                {metric.name}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Measurement
              </span>
              <p className="text-xs font-medium text-slate-300 mt-0.5">
                {metric.unit || "Measured Periodically"}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Current
              </span>
              <p className="text-sm font-black text-cyan-400 mt-0.5">
                {metric.currentValue !== undefined ? metric.currentValue : "Baseline Pending"}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Status
              </span>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                {outcome.status === "ACHIEVED"
                  ? "✓ Target Reached"
                  : outcome.status === "PARTIALLY_ACHIEVED"
                  ? "● Partially Met"
                  : outcome.status === "EXECUTING"
                  ? "● In Progress"
                  : outcome.status}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Qualitative Acceptance Criteria List */}
      <div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Acceptance Specifications ({outcome.successCriteria.length})
        </span>
        <ul className="space-y-2">
          {outcome.successCriteria.map((criterion, idx) => {
            const isMet = outcome.verification?.criteriaMet?.includes(criterion);
            const isUnmet = outcome.verification?.criteriaUnmet?.includes(criterion);

            return (
              <li
                key={idx}
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                  isMet
                    ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                    : isUnmet
                    ? "bg-rose-950/20 border-rose-900/40 text-rose-300"
                    : "bg-slate-950/50 border-slate-800/80 text-slate-300"
                }`}
              >
                <span
                  className={`font-bold mt-0.5 ${
                    isMet
                      ? "text-emerald-400"
                      : isUnmet
                      ? "text-rose-400"
                      : "text-slate-500"
                  }`}
                >
                  {isMet ? "✓" : isUnmet ? "✗" : "○"}
                </span>
                <div className="flex-1 leading-relaxed">
                  <span>{criterion}</span>
                  {isMet && (
                    <span className="block text-[10px] text-emerald-400/80 font-mono mt-0.5">
                      Verified by ELMO Outcome Verification
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
