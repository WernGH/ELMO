"use client";

import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import { ExecutionStep } from "@/services/agentic/types/agentic.types";

interface AgentPlanProgressProps {
  steps: ExecutionStep[] | Array<{ id: string; stepNumber?: number; agentName: string; task: string; status: string }>;
  currentStepIndex?: number;
  isComplete?: boolean;
}

export function AgentPlanProgress({ steps, isComplete }: AgentPlanProgressProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="w-full my-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">
        <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
        <span>ELMO Autonomous Agent Execution</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {steps.map((step, idx) => {
          const isDone = step.status === "COMPLETED" || isComplete;
          const isInProgress = step.status === "IN_PROGRESS" && !isComplete;

          return (
            <div
              key={step.id || idx}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                isDone
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : isInProgress
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10 animate-pulse"
                  : "bg-slate-950/60 border-slate-800/80 text-slate-500"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : isInProgress ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-slate-600" />
              )}
              <span className="font-medium">{step.agentName || `Step ${idx + 1}`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
