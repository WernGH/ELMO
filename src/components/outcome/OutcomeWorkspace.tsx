"use client";

import React, { useState } from "react";
import {
  DesiredOutcome,
  RobotIdentity,
  WorkforceArtifact,
  WorkerHandoffContract,
  WorkerActivityRecord,
  RobotToolUsage,
} from "@/services/agentic/types/agentic.types";
import { OutcomeHeader } from "./OutcomeHeader";
import { OutcomeSuccessCriteria } from "./OutcomeSuccessCriteria";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { ElmoExecutivePanel } from "./ElmoExecutivePanel";
import { OutcomeExecutionGraph, ExecutionGraphNode } from "./OutcomeExecutionGraph";
import { OutcomeResultScreen } from "./OutcomeResultScreen";
import { OutcomeVoiceIntake } from "./OutcomeVoiceIntake";
import { RobotCard } from "../robot/RobotCard";
import { RobotDetailPanel } from "../robot/RobotDetailPanel";
import { RobotArtifact } from "../robot/RobotArtifact";
import { RobotToolActivity } from "../robot/RobotToolActivity";
import { RobotHandoff } from "../robot/RobotHandoff";
import { useOutcomeStream } from "@/hooks/useOutcomeStream";
import { Radio, Sparkles } from "lucide-react";

interface OutcomeWorkspaceProps {
  outcome: DesiredOutcome;
  robots: RobotIdentity[];
  handoffs?: WorkerHandoffContract[];
  activities?: WorkerActivityRecord[];
  onStartExecution?: (outcomeId: string) => void;
  onApproveOutcome?: (outcomeId: string) => void;
  onRejectOutcome?: (outcomeId: string, reason?: string) => void;
  onVerifyOutcome?: (outcomeId: string) => void;
  onRefresh?: () => void;
  onOpenOutcomeModal?: () => void;
  onCommitOutcome?: (prompt: string) => void;
}

export function OutcomeWorkspace({
  outcome,
  robots,
  handoffs = [],
  activities = [],
  onStartExecution,
  onApproveOutcome,
  onRejectOutcome,
  onVerifyOutcome,
  onRefresh,
  onOpenOutcomeModal,
  onCommitOutcome,
}: OutcomeWorkspaceProps) {
  const [selectedRobot, setSelectedRobot] = useState<RobotIdentity | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    "overview" | "plan" | "workforce" | "telemetry" | "artifacts"
  >("overview");

  // Zero-Latency Server-Sent Events (SSE) stream subscription
  const { workspace: streamedWorkspace, connected: isLiveStreamConnected } = useOutcomeStream({
    outcomeId: outcome?.outcomeId,
    organizationId: outcome?.organizationId,
  });

  const activeOutcome = streamedWorkspace?.outcome || outcome;
  const activeActivities = streamedWorkspace?.activities || activities;
  const activeHandoffs = streamedWorkspace?.handoffs || handoffs;
  const activeArtifacts = streamedWorkspace?.artifacts || outcome.artifacts || [];

  const handleInspectRobot = (robot: RobotIdentity) => {
    setSelectedRobot(robot);
    setIsDetailDrawerOpen(true);
  };

  // Find currently active worker
  const currentRobot = robots.find(
    (r) =>
      r.status === "WORKING" ||
      r.displayName.toLowerCase() === activeOutcome.currentWorkerId?.toLowerCase()
  );

  const isFinalOutcome =
    activeOutcome.status === "ACHIEVED" ||
    activeOutcome.status === "PARTIALLY_ACHIEVED" ||
    activeOutcome.status === "FAILED";

  const graphNodes: ExecutionGraphNode[] = activeOutcome.assignedWorkers.map((name: string, idx: number) => {
    const robot = robots.find((r) => r.displayName.toLowerCase() === name.toLowerCase()) || {
      avatarKey: name.toLowerCase(),
      role: `${name} Specialist`,
      capabilities: [],
      tools: [],
    };
    const ms = activeOutcome.milestones.find((m: any) => m.robotName?.toLowerCase() === name.toLowerCase());
    const status = ms ? ms.status : (idx === 0 ? "IN_PROGRESS" : "PENDING");
    const depId = idx > 0 ? `step-${idx - 1}` : "";
    return {
      id: `step-${idx}`,
      stepNumber: idx + 1,
      robotName: name,
      avatarKey: (robot as any).avatarKey || name.toLowerCase(),
      role: robot.role || "Specialist Worker",
      task: ms?.title || `Execute ${name} capabilities for ${activeOutcome.title}`,
      status: status as any,
      dependencies: depId ? [depId] : [],
      tools: (robot as any).tools?.slice(0, 3) || [],
    };
  });

  const allTools: RobotToolUsage[] = robots.flatMap((r) => r.recentTools || []);

  return (
    <div className="space-y-6">
      {/* Real-time Streaming & Voice Intake Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isLiveStreamConnected ? "bg-[#00FF66]" : "bg-amber-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isLiveStreamConnected ? "bg-[#00FF66]" : "bg-amber-500"
              }`}
            ></span>
          </span>
          <span className="text-xs font-mono text-zinc-300">
            {isLiveStreamConnected
              ? "⚡ SSE Live Event Stream Connected"
              : "● Polling Active (Syncing with ELMO Engine)"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenOutcomeModal && (
            <button
              onClick={onOpenOutcomeModal}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00FF66]" />
              New Outcome
            </button>
          )}
        </div>
      </div>

      {/* Voice & Prompt Intake Bar */}
      {onCommitOutcome && (
        <OutcomeVoiceIntake onCommitOutcome={onCommitOutcome} />
      )}

      {/* 1. ELMO EXECUTIVE SUPERVISION PANEL (Section N) */}
      <ElmoExecutivePanel
        outcome={activeOutcome}
        currentWorker={currentRobot}
        onOpenOutcomeModal={onOpenOutcomeModal}
      />

      {/* 2. OUTCOME HEADER (Section B2) */}
      <OutcomeHeader
        outcome={activeOutcome}
        onRefresh={onRefresh}
      />

      {/* 3. BLOCKER UI (Section L) if outcome is BLOCKED */}
      {activeOutcome.status === "BLOCKED" && activeOutcome.blocker && (
        <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h3 className="text-sm font-black text-rose-300 uppercase tracking-wider">
              Outcome Execution Blocked
            </h3>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-900/40 space-y-2">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Blocker Diagnostic
              </span>
              <p className="text-xs font-semibold text-rose-300 mt-0.5">
                {activeOutcome.blocker.reason.replace(/_/g, " ")}
              </p>
            </div>

            {activeOutcome.blocker.whatCompleted && activeOutcome.blocker.whatCompleted.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Completed Before Block
                </span>
                <ul className="space-y-1">
                  {activeOutcome.blocker.whatCompleted.map((item: string, idx: number) => (
                    <li key={idx} className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeOutcome.blocker.whatIsMissing && activeOutcome.blocker.whatIsMissing.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                  Missing Capabilities / Integrations
                </span>
                <ul className="space-y-1">
                  {activeOutcome.blocker.whatIsMissing.map((item: string, idx: number) => (
                    <li key={idx} className="text-xs text-rose-300 flex items-center gap-1.5">
                      <span>✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                Required Human Action
              </span>
              <p className="text-xs text-slate-200 bg-slate-900/60 p-2 rounded border border-slate-800">
                {activeOutcome.blocker.nextAction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. APPROVAL UI (Section K) if outcome is WAITING */}
      {activeOutcome.status === "WAITING" && (
        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                Human Approval Required Before High-Impact Execution
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Authority Gate
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-amber-900/40">
            Specialist workers have prepared an execution workflow. Autonomous activation is paused under strict safety governance. Human authorization is mandatory.
          </p>

          <div className="flex items-center gap-3 pt-2">
            {onApproveOutcome && (
              <button
                onClick={() => onApproveOutcome(activeOutcome.outcomeId)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition-colors"
              >
                ✓ Approve & Authorize
              </button>
            )}
            {onRejectOutcome && (
              <button
                onClick={() => onRejectOutcome(activeOutcome.outcomeId, "Authorization declined by human user.")}
                className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-colors"
              >
                ✕ Decline Execution
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. START / VERIFY EXECUTION ACTIONS */}
      {activeOutcome.status === "READY" && onStartExecution && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-[#00FF66]/30 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-white">Workforce Assembled & Verified</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              All required specialist robots are ready to execute dynamic milestones.
            </p>
          </div>
          <button
            onClick={() => onStartExecution(activeOutcome.outcomeId)}
            className="px-4 py-2 rounded-lg bg-[#00FF66] hover:bg-[#00e65c] text-black font-black text-xs shadow-[0_0_15px_rgba(0,255,102,0.3)] transition-all"
          >
            ▶ Start Execution
          </button>
        </div>
      )}

      {activeOutcome.status === "EXECUTING" && onVerifyOutcome && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-purple-300">Milestones in Progress</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Specialist robots are performing active tasks. You may trigger outcome verification against target acceptance criteria.
            </p>
          </div>
          <button
            onClick={() => onVerifyOutcome(activeOutcome.outcomeId)}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            🛡️ Verify Outcome
          </button>
        </div>
      )}

      {/* 6. FINAL RESULT SCREEN (Section M) if verified */}
      {isFinalOutcome && (
        <OutcomeResultScreen
          outcome={activeOutcome}
          onRetryOrAdjust={() => onStartExecution?.(activeOutcome.outcomeId)}
        />
      )}

      {/* 7. NAVIGATION TABS: Outcome Hierarchy (Section B1) */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 rounded-t-xl overflow-x-auto px-2 gap-1">
        {[
          { id: "overview", label: "Executive Overview", icon: "🎯" },
          { id: "plan", label: "Dynamic Execution Graph", icon: "🗺️" },
          { id: "workforce", label: "Robot Workforce", icon: "🤖", count: robots.length },
          { id: "telemetry", label: "Tool Telemetry & Handoffs", icon: "⚡" },
          { id: "artifacts", label: "Work Products", icon: "📦", count: activeArtifacts.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveWorkspaceTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
              activeWorkspaceTab === tab.id
                ? "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 8. TAB CONTENTS */}
      {activeWorkspaceTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Success Criteria & Measurable Targets */}
          <OutcomeSuccessCriteria outcome={activeOutcome} />

          {/* Right Column: Execution Timeline (Section F) */}
          <ExecutionTimeline
            milestones={activeOutcome.milestones}
            activities={activeActivities}
          />
        </div>
      )}

      {activeWorkspaceTab === "plan" && (
        <OutcomeExecutionGraph
          nodes={graphNodes}
          onSelectNode={(node: ExecutionGraphNode) => {
            const found = robots.find((r) => r.displayName.toLowerCase() === node.robotName.toLowerCase());
            if (found) handleInspectRobot(found);
          }}
        />
      )}

      {activeWorkspaceTab === "workforce" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assigned Specialist Robots ({robots.length})
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Click any robot to inspect structured state & tools
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {robots.map((robot) => (
              <RobotCard
                key={robot.robotId}
                robot={robot}
                isActive={selectedRobot?.robotId === robot.robotId}
                onInspect={handleInspectRobot}
              />
            ))}
          </div>
        </div>
      )}

      {activeWorkspaceTab === "telemetry" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool Activity Telemetry (Section I) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🛠</span>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Live Tool Execution Telemetry
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Sanitized Real-Time
              </span>
            </div>
            <RobotToolActivity tools={allTools} />
          </div>

          {/* Handoff Inspector (Section H) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🤝</span>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Worker Handoff Inspector
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Deterministic Contracts
              </span>
            </div>
            {activeHandoffs.length > 0 ? (
              <div className="space-y-3">
                {activeHandoffs.map((h: any, idx: number) => (
                  <RobotHandoff key={idx} handoff={h} />
                ))}
              </div>
            ) : (
              <RobotHandoff />
            )}
          </div>
        </div>
      )}

      {activeWorkspaceTab === "artifacts" && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📦</span>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Work Products & Generated Artifacts
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Verified Assets ({activeArtifacts.length})
            </span>
          </div>
          <RobotArtifact artifacts={activeArtifacts} />
        </div>
      )}

      {/* 9. ROBOT DETAIL DRAWER (Section E) */}
      <RobotDetailPanel
        robot={selectedRobot}
        outcomeTitle={activeOutcome.title}
        artifacts={activeArtifacts}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedRobot(null);
        }}
      />
    </div>
  );
}
