"use client";

import React from "react";
import { DesiredOutcome } from "@/services/agentic/types/agentic.types";
import { RobotAvatar } from "../robot/RobotAvatar";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface OutcomeResultScreenProps {
  outcome: DesiredOutcome;
  onInspectArtifact?: (artifactId: string) => void;
  onRetryOrAdjust?: () => void;
  className?: string;
}

export const OutcomeResultScreen: React.FC<OutcomeResultScreenProps> = ({
  outcome,
  onInspectArtifact,
  onRetryOrAdjust,
  className = "",
}) => {
  const isAchieved = outcome.status === "ACHIEVED";
  const isPartial = outcome.status === "PARTIALLY_ACHIEVED";
  const isFailed = outcome.status === "FAILED";

  return (
    <div
      className={`rounded-2xl bg-zinc-950 border ${
        isAchieved
          ? "border-[#00FF66]/40 shadow-[0_0_25px_rgba(0,255,102,0.15)]"
          : isPartial
          ? "border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
          : "border-rose-500/40"
      } p-6 sm:p-8 space-y-6 text-white ${className}`}
    >
      {/* Result Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span>🎯</span> Outcome Result Summary
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {outcome.title}
          </h2>
        </div>

        <div>
          {isAchieved ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/40 shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <CheckCircle2 className="w-5 h-5 text-[#00FF66]" />
              ✓ ACHIEVED
            </span>
          ) : isPartial ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/40">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              🟡 PARTIALLY ACHIEVED
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              ✗ FAILED
            </span>
          )}
        </div>
      </div>

      {/* Target vs Measured Telemetry */}
      {outcome.targetMetric && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800">
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-zinc-400">Target Goal</span>
            <div className="text-2xl font-extrabold text-white">
              {outcome.targetMetric.targetValue}
            </div>
            <p className="text-xs text-zinc-400">{outcome.targetMetric.name}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-zinc-400">Verified Result</span>
            <div
              className={`text-2xl font-extrabold ${
                isAchieved ? "text-[#00FF66]" : "text-yellow-400"
              }`}
            >
              {outcome.targetMetric.currentValue || "Measured"}
            </div>
            <p className="text-xs text-zinc-400">Grounded in business telemetry</p>
          </div>
        </div>
      )}

      {/* Workforce Used */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Workforce Specialists Used
        </h4>
        <div className="flex flex-wrap gap-2.5">
          {outcome.assignedWorkers.map((name, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-white"
            >
              <RobotAvatar avatarKey={name.toLowerCase()} displayName={name} size="sm" status="COMPLETE" />
              <span>🤖 {name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dual Verification Clearance */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#00FF66]" />
          <div>
            <span className="font-semibold text-white">Outcome Verification Clearance: </span>
            <span className="text-zinc-300">
              {outcome.verification?.verified ? "✓ Fully Passed" : "Partial / Unverified criteria"}
            </span>
          </div>
        </div>
        <span className="text-zinc-500 font-mono text-[11px]">
          OutcomeVerificationService
        </span>
      </div>

      {/* Partial / Blocked Transparent Explanation */}
      {outcome.explanation && (
        <div className="space-y-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs">
          <h4 className="font-bold text-zinc-200 uppercase tracking-wider">
            Executive Diagnostic Report
          </h4>

          {outcome.explanation.whatAchieved?.length > 0 && (
            <div>
              <span className="text-emerald-400 font-semibold">What Was Achieved:</span>
              <ul className="list-disc list-inside text-zinc-300 pl-1 mt-0.5 space-y-0.5">
                {outcome.explanation.whatAchieved.map((a, idx) => (
                  <li key={idx}>✓ {a}</li>
                ))}
              </ul>
            </div>
          )}

          {outcome.explanation.whatRemains?.length > 0 && (
            <div>
              <span className="text-yellow-400 font-semibold">What Remains:</span>
              <ul className="list-disc list-inside text-zinc-300 pl-1 mt-0.5 space-y-0.5">
                {outcome.explanation.whatRemains.map((r, idx) => (
                  <li key={idx}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {outcome.explanation.whyPartial && (
            <div>
              <span className="text-zinc-400 font-semibold">Why Target Not Fully Achieved: </span>
              <span className="text-zinc-300">{outcome.explanation.whyPartial}</span>
            </div>
          )}

          {outcome.explanation.nextSteps?.length > 0 && (
            <div>
              <span className="text-cyan-400 font-semibold">Recommended Next Steps:</span>
              <ul className="list-disc list-inside text-zinc-300 pl-1 mt-0.5 space-y-0.5">
                {outcome.explanation.nextSteps.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Attached Work Products / Artifacts */}
      {outcome.artifacts?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-400" />
            Produced Work Products ({outcome.artifacts.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {outcome.artifacts.map((art) => (
              <div
                key={art.artifactId}
                onClick={() => onInspectArtifact?.(art.artifactId)}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span>📦</span>
                  <div className="truncate">
                    <div className="text-xs font-medium text-white truncate">{art.title}</div>
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">{art.artifactType}</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono">
                  {art.version ? `v${art.version}` : "v1"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
