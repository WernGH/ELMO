import React, { useState } from "react";
import { RobotIdentity as RobotIdentityType, WorkforceArtifact } from "@/services/agentic/types/agentic.types";
import { RobotIdentity } from "./RobotIdentity";
import { RobotInput } from "./RobotInput";
import { RobotToolActivity } from "./RobotToolActivity";
import { RobotOutput } from "./RobotOutput";
import { RobotVerification } from "./RobotVerification";
import { RobotHandoff } from "./RobotHandoff";
import { RobotArtifact } from "./RobotArtifact";
import { RobotActivity } from "./RobotActivity";

interface RobotDetailPanelProps {
  robot: RobotIdentityType | null;
  outcomeTitle?: string;
  artifacts?: WorkforceArtifact[];
  isOpen: boolean;
  onClose: () => void;
}

export function RobotDetailPanel({
  robot,
  outcomeTitle,
  artifacts = [],
  isOpen,
  onClose,
}: RobotDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "input" | "tools" | "output" | "verification" | "handoff" | "artifacts" | "activity"
  >("overview");

  if (!isOpen || !robot) return null;

  // Filter artifacts produced by this worker
  const workerArtifacts = artifacts.filter(
    (a) =>
      a.sourceWorker === robot.workerId ||
      a.sourceWorker?.toLowerCase().includes(robot.displayName.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col h-full transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <RobotIdentity robot={robot} showDetails={false} avatarSize="md" />
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Close Drawer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/30 overflow-x-auto px-4 gap-1">
          {[
            { id: "overview", label: "Overview", icon: "🤖" },
            { id: "input", label: "Input", icon: "📥" },
            { id: "tools", label: "Tools", icon: "🛠" },
            { id: "output", label: "Output", icon: "📤" },
            { id: "verification", label: "Verification", icon: "🛡" },
            { id: "handoff", label: "Handoff", icon: "🤝" },
            { id: "artifacts", label: "Artifacts", icon: "📦", count: workerArtifacts.length },
            { id: "activity", label: "Activity", icon: "⚡" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id
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

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Current Context */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Active Execution Context
                </span>
                <div>
                  <span className="text-xs text-slate-400">Current Outcome:</span>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">
                    {outcomeTitle || robot.currentOutcomeId || "General AI Workforce Supervision"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Current Task:</span>
                  <p className="text-xs text-emerald-400 font-medium mt-0.5 bg-slate-950/60 p-2 rounded border border-slate-800">
                    {robot.currentTask || "Standing by for outcome-directed delegation."}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Registered Skills ({robot.skills.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {robot.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Permissions & Capabilities */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Governed Capabilities ({robot.capabilities.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {robot.capabilities.map((cap, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs font-medium"
                    >
                      ✓ {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sanitized Tool Access */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Approved Tool Integrations ({robot.tools.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {robot.tools.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded bg-blue-950/30 border border-blue-900/40 text-blue-300 text-xs font-mono"
                    >
                      🛠 {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "input" && (
            <RobotInput input={robot.structuredInput} />
          )}

          {activeTab === "tools" && (
            <RobotToolActivity
              tools={robot.recentTools}
              robotName={robot.displayName}
            />
          )}

          {activeTab === "output" && (
            <RobotOutput output={robot.structuredOutput} />
          )}

          {activeTab === "verification" && (
            <RobotVerification verification={robot.verification} />
          )}

          {activeTab === "handoff" && (
            <RobotHandoff handoff={robot.handoffState} />
          )}

          {activeTab === "artifacts" && (
            <RobotArtifact artifacts={workerArtifacts} />
          )}

          {activeTab === "activity" && (
            <RobotActivity />
          )}
        </div>
      </div>
    </div>
  );
}
