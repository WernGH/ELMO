import React from "react";
import { RobotStructuredInput } from "@/services/agentic/types/agentic.types";

interface RobotInputProps {
  input?: RobotStructuredInput;
  className?: string;
}

export function RobotInput({ input, className = "" }: RobotInputProps) {
  if (!input) {
    return (
      <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic ${className}`}>
        No active structured input assigned. Robot is ready for workforce delegation.
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 rounded-lg bg-slate-900/70 border border-slate-800/80 ${className}`}>
      <div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
          Objective
        </span>
        <p className="text-sm font-medium text-slate-200 bg-slate-950/60 p-2.5 rounded border border-slate-800">
          {input.objective}
        </p>
      </div>

      {input.context && input.context.length > 0 && (
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Context & Verified Inputs
          </span>
          <ul className="space-y-1">
            {input.context.map((ctx, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-300 flex items-start gap-1.5 bg-slate-950/40 px-2 py-1 rounded"
              >
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{ctx}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {input.constraints && input.constraints.length > 0 && (
        <div>
          <span className="text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider block mb-1">
            Constraints & Guardrails
          </span>
          <ul className="space-y-1">
            {input.constraints.map((c, idx) => (
              <li
                key={idx}
                className="text-xs text-amber-300/90 flex items-start gap-1.5 bg-amber-950/20 border border-amber-900/30 px-2 py-1 rounded"
              >
                <span className="text-amber-400 font-bold">⚠</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {input.expectedOutput && (
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Expected Deliverable
          </span>
          <p className="text-xs text-slate-300 bg-slate-950/40 p-2 rounded border border-slate-800/60">
            {input.expectedOutput}
          </p>
        </div>
      )}
    </div>
  );
}
