"use client";

import React from "react";
import { RobotIdentity } from "@/services/agentic/types/agentic.types";
import { RobotAvatar } from "./RobotAvatar";
import {
  X,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wrench,
  BookOpen,
  FileText,
  ShieldCheck,
  Layers,
  Clock,
} from "lucide-react";

interface RobotDetailModalProps {
  robot: RobotIdentity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RobotDetailModal: React.FC<RobotDetailModalProps> = ({
  robot,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !robot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 text-white space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3.5">
            <RobotAvatar
              avatarKey={robot.avatarKey}
              displayName={robot.displayName}
              status={robot.status}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight text-white">
                  🤖 {robot.displayName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-emerald-400 border border-emerald-500/20">
                  {robot.status}
                </span>
              </div>
              <p className="text-sm text-zinc-400 font-medium mt-0.5">{robot.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Outcome & Task */}
        <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wider uppercase">
            <Target className="w-3.5 h-3.5" />
            Current Assignment
          </div>
          <div className="text-sm font-medium text-white">
            {robot.currentTask || "Standing by for outcome task delegation."}
          </div>
          {robot.currentOutcomeId && (
            <div className="text-xs text-zinc-400 font-mono">
              Outcome ID: {robot.currentOutcomeId}
            </div>
          )}
        </div>

        {/* Structured Robot Input */}
        {robot.structuredInput && (
          <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Structured Worker Input
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-500 font-medium">Objective: </span>
                <span className="text-zinc-200">{robot.structuredInput.objective}</span>
              </div>

              {robot.structuredInput.context?.length > 0 && (
                <div>
                  <span className="text-zinc-500 font-medium">Context Ingested:</span>
                  <ul className="list-disc list-inside mt-1 text-zinc-300 space-y-0.5 pl-2">
                    {robot.structuredInput.context.map((ctx, idx) => (
                      <li key={idx}>✓ {ctx}</li>
                    ))}
                  </ul>
                </div>
              )}

              {robot.structuredInput.constraints?.length > 0 && (
                <div>
                  <span className="text-zinc-500 font-medium">Constraints:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {robot.structuredInput.constraints.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {robot.structuredInput.expectedOutput && (
                <div>
                  <span className="text-zinc-500 font-medium">Expected Deliverable: </span>
                  <span className="text-emerald-300">{robot.structuredInput.expectedOutput}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real Tool Visibility */}
        {robot.recentTools?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              Live Tool Telemetry (Sanitized)
            </div>
            <div className="space-y-1.5">
              {robot.recentTools.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400">🛠 {t.toolName}</span>
                    <span className="text-zinc-400 truncate max-w-sm">
                      {t.sanitizedSummary}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structured Output & Artifact */}
        {robot.structuredOutput && (
          <div className="bg-emerald-950/20 rounded-xl p-4 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Structured Worker Output
              </div>
              {robot.verification?.passed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Verified Passed
                </span>
              )}
            </div>

            {robot.structuredOutput.findings?.length > 0 && (
              <div className="space-y-1 text-xs">
                <div className="text-zinc-400 font-medium">Verified Findings:</div>
                <ul className="list-disc list-inside text-zinc-200 pl-1 space-y-1">
                  {robot.structuredOutput.findings.map((f, idx) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {robot.structuredOutput.artifactTitle && (
              <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-400 font-medium">Artifact:</span>
                <span className="text-white font-medium">
                  📦 {robot.structuredOutput.artifactTitle}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Handoff State */}
        {robot.handoffState && (
          <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-400">Next Worker:</span>
              <span className="text-white font-semibold">{robot.handoffState.toWorkerId}</span>
            </div>
            <span className="text-zinc-400 truncate max-w-xs">{robot.handoffState.summary}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
