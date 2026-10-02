"use client";

import React, { useState } from "react";
import { RobotAvatar } from "../robot/RobotAvatar";
import { ArrowDown, CheckCircle2, ShieldCheck, Zap, Layers, Sparkles } from "lucide-react";

export interface ExecutionGraphNode {
  id: string;
  stepNumber: number;
  robotName: string;
  avatarKey: string;
  role: string;
  task: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "FAILED";
  dependencies: string[];
  tools?: string[];
  parallelGroup?: string;
}

interface OutcomeExecutionGraphProps {
  nodes: ExecutionGraphNode[];
  onSelectNode?: (node: ExecutionGraphNode) => void;
  className?: string;
}

export const OutcomeExecutionGraph: React.FC<OutcomeExecutionGraphProps> = ({
  nodes,
  onSelectNode,
  className = "",
}) => {
  const [viewMode, setViewMode] = useState<"canvas" | "stages">("canvas");

  if (!nodes || nodes.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center text-zinc-500 text-sm ${className}`}>
        Dynamic execution plan not yet generated.
      </div>
    );
  }

  // Calculate dependency levels
  const stageMap = new Map<number, ExecutionGraphNode[]>();
  const nodeLevel = new Map<string, number>();

  for (const node of nodes) {
    if (!node.dependencies || node.dependencies.length === 0) {
      nodeLevel.set(node.id, 0);
    } else {
      let maxDepLevel = 0;
      for (const depId of node.dependencies) {
        const depLvl = nodeLevel.get(depId) ?? 0;
        if (depLvl + 1 > maxDepLevel) {
          maxDepLevel = depLvl + 1;
        }
      }
      nodeLevel.set(node.id, maxDepLevel);
    }
  }

  for (const node of nodes) {
    const lvl = nodeLevel.get(node.id) || 0;
    const current = stageMap.get(lvl) || [];
    current.push(node);
    stageMap.set(lvl, current);
  }

  const sortedStages = Array.from(stageMap.entries()).sort(([a], [b]) => a - b);

  return (
    <div className={`p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6 ${className}`}>
      {/* Header with View Mode Toggle */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00FF66]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Workforce Dynamic Execution DAG
          </h4>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
            {nodes.length} Dynamic Nodes
          </span>

          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("canvas")}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all flex items-center gap-1.5 ${
                viewMode === "canvas"
                  ? "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3" />
              Interactive Canvas
            </button>
            <button
              onClick={() => setViewMode("stages")}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all flex items-center gap-1.5 ${
                viewMode === "stages"
                  ? "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-3 h-3" />
              Stages
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE SVG FLOW CANVAS */}
      {viewMode === "canvas" && (
        <div className="relative w-full overflow-x-auto py-4">
          <div className="min-w-[640px] flex flex-col items-center">
            {/* 1. Root Outcome Goal Node */}
            <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-950/70 to-zinc-900 border border-emerald-500/40 text-xs font-bold text-white shadow-[0_0_16px_rgba(0,255,102,0.2)] flex items-center gap-2 z-10">
              <span className="text-[#00FF66] text-sm">🎯</span> Desired Business Outcome
            </div>

            {/* SVG Connector: Outcome -> ELMO */}
            <svg width="24" height="32" className="overflow-visible">
              <line x1="12" y1="0" x2="12" y2="32" stroke="#00FF66" strokeWidth="2" strokeDasharray="3 3" />
            </svg>

            {/* 2. Executive ELMO Orchestrator Node */}
            <div className="px-5 py-3 rounded-2xl bg-zinc-900/95 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center gap-3 z-10">
              <RobotAvatar avatarKey="elmo" displayName="ELMO" size="sm" status="WORKING" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300">🤖 ELMO</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    EXECUTIVE
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400">Decomposing outcome into specialized worker DAG</div>
              </div>
            </div>

            {/* SVG Fan-out Connector: ELMO -> Dynamic Workers */}
            <div className="w-full max-w-2xl h-10 relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path
                  d="M 50,0 Q 50,20 20,40 M 50,0 Q 50,20 50,40 M 50,0 Q 50,20 80,40"
                  fill="none"
                  stroke="rgba(0,255,102,0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              </svg>
            </div>

            {/* 3. Dynamic Specialist Workers Grid */}
            <div className="flex flex-wrap items-center justify-center gap-4 w-full py-2 z-10">
              {nodes.map((node, idx) => {
                const isWorking = node.status === "IN_PROGRESS";
                const isComplete = node.status === "COMPLETED";
                const isBlocked = node.status === "BLOCKED";

                return (
                  <div
                    key={node.id}
                    onClick={() => onSelectNode?.(node)}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer w-64 ${
                      isWorking
                        ? "bg-zinc-900 border-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.3)] ring-1 ring-[#00FF66]/50 scale-[1.02]"
                        : isComplete
                        ? "bg-zinc-900/90 border-emerald-500/40 hover:border-emerald-400 shadow-md"
                        : isBlocked
                        ? "bg-rose-950/40 border-rose-500/50 text-rose-300 shadow-md"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Top Node Header */}
                    <div className="flex items-center gap-3">
                      <RobotAvatar
                        avatarKey={node.avatarKey}
                        displayName={node.robotName}
                        size="sm"
                        status={
                          isWorking
                            ? "WORKING"
                            : isComplete
                            ? "COMPLETED"
                            : isBlocked
                            ? "BLOCKED"
                            : "READY"
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            🤖 {node.robotName}
                          </span>
                          {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />}
                          {isWorking && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF66]"></span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">{node.role}</div>
                      </div>
                    </div>

                    {/* Task Description */}
                    <div className="text-[11px] text-zinc-300 font-medium mt-2.5 line-clamp-2 leading-relaxed bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                      {node.task}
                    </div>

                    {/* Tool Badges */}
                    {node.tools && node.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {node.tools.slice(0, 2).map((t, tidx) => (
                          <span
                            key={tidx}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-emerald-400 border border-emerald-950"
                          >
                            🛠 {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SVG Convergence Connector: Workers -> Verification */}
            <div className="w-full max-w-2xl h-10 relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path
                  d="M 20,0 Q 50,20 50,40 M 50,0 Q 50,20 50,40 M 80,0 Q 50,20 50,40"
                  fill="none"
                  stroke="rgba(168,85,247,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              </svg>
            </div>

            {/* 4. Verification Checkpoint Node */}
            <div className="px-5 py-2.5 rounded-xl bg-purple-950/50 border border-purple-500/40 text-xs font-semibold text-white flex items-center gap-2 shadow-[0_0_16px_rgba(168,85,247,0.25)] z-10">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Independent Outcome Verification & Metric Delta Evaluation</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: COMPACT STAGE LIST */}
      {viewMode === "stages" && (
        <div className="flex flex-col items-center space-y-4 py-2">
          {sortedStages.map(([lvl, stageNodes], sIdx) => (
            <React.Fragment key={lvl}>
              <div
                className={`flex flex-wrap items-center justify-center gap-4 w-full ${
                  stageNodes.length > 1 ? "py-2 px-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60" : ""
                }`}
              >
                {stageNodes.map((node) => {
                  const isWorking = node.status === "IN_PROGRESS";
                  const isComplete = node.status === "COMPLETED";
                  const isBlocked = node.status === "BLOCKED";

                  return (
                    <div
                      key={node.id}
                      onClick={() => onSelectNode?.(node)}
                      className={`relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer min-w-[200px] max-w-xs ${
                        isWorking
                          ? "bg-zinc-900 border-[#00FF66] shadow-[0_0_18px_rgba(0,255,102,0.25)] ring-1 ring-[#00FF66]/40"
                          : isComplete
                          ? "bg-zinc-900/80 border-emerald-500/30 hover:border-emerald-500/60"
                          : isBlocked
                          ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <RobotAvatar
                          avatarKey={node.avatarKey}
                          displayName={node.robotName}
                          size="sm"
                          status={
                            isWorking
                              ? "WORKING"
                              : isComplete
                              ? "COMPLETED"
                              : isBlocked
                              ? "BLOCKED"
                              : "READY"
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">
                              🤖 {node.robotName}
                            </span>
                            {isComplete && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
                            )}
                            {isWorking && (
                              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{node.role}</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-300 font-medium mt-2 line-clamp-2">
                        {node.task}
                      </div>
                    </div>
                  );
                })}
              </div>

              {sIdx < sortedStages.length - 1 && (
                <ArrowDown className="w-4 h-4 text-emerald-500/60" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
