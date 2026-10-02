import React from "react";
import { RobotStructuredOutput } from "@/services/agentic/types/agentic.types";

interface RobotOutputProps {
  output?: RobotStructuredOutput;
  className?: string;
  onOpenArtifact?: (artifactId: string) => void;
}

export function RobotOutput({
  output,
  className = "",
  onOpenArtifact,
}: RobotOutputProps) {
  if (!output) {
    return (
      <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic ${className}`}>
        No structured output generated yet. Output will appear upon verified task completion.
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 rounded-lg bg-slate-900/70 border border-slate-800/80 ${className}`}>
      {/* Verification status header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Worker Output & Findings
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
            output.verificationPassed
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
          }`}
        >
          {output.verificationPassed ? "✓ Verified" : "● Unverified"}
        </span>
      </div>

      {/* Findings */}
      {output.findings && output.findings.length > 0 && (
        <div>
          <span className="text-[11px] font-medium text-slate-300 block mb-1">
            Key Findings ({output.findings.length})
          </span>
          <ul className="space-y-1.5">
            {output.findings.map((f, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800 flex items-start gap-2"
              >
                <span className="text-emerald-400 font-bold">•</span>
                <span className="leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence */}
      {output.evidence && output.evidence.length > 0 && (
        <div>
          <span className="text-[11px] font-medium text-slate-300 block mb-1">
            Telemetry Evidence & Sourced Data
          </span>
          <ul className="space-y-1">
            {output.evidence.map((e, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-400 font-mono bg-slate-950/40 px-2 py-1 rounded border border-slate-800/60"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Produced Artifact */}
      {output.artifactId && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>📦</span>
            <span className="font-semibold text-slate-200">
              {output.artifactTitle || "Generated Work Product"}
            </span>
          </div>
          {onOpenArtifact && (
            <button
              onClick={() => onOpenArtifact(output.artifactId!)}
              className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium transition-colors"
            >
              Inspect Artifact →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
