"use client";

import React from "react";
import { RobotIdentity, RobotStatus } from "@/services/agentic/types/agentic.types";
import { RobotAvatar } from "./RobotAvatar";
import { ArrowRight, Wrench, Shield, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface RobotCardProps {
  robot: RobotIdentity;
  isActive?: boolean;
  onInspect?: (robot: RobotIdentity) => void;
  className?: string;
}

export const RobotCard: React.FC<RobotCardProps> = ({
  robot,
  isActive = false,
  onInspect,
  className = "",
}) => {
  const getStatusBadge = (status: RobotStatus) => {
    switch (status) {
      case "WORKING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
            Working
          </span>
        );
      case "THINKING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Thinking
          </span>
        );
      case "VERIFYING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <CheckCircle2 className="w-3 h-3 text-purple-400" />
            Verifying
          </span>
        );
      case "APPROVAL_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-bounce">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Approval Required
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Blocked
          </span>
        );
      case "COMPLETE":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Completed
          </span>
        );
      case "USING_TOOL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
            <Wrench className="w-3 h-3 text-blue-400" />
            Using Tool
          </span>
        );
      case "READY":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ready
          </span>
        );
    }
  };

  const activeTool = robot.recentTools?.[0];

  return (
    <div
      onClick={() => onInspect?.(robot)}
      className={`group relative p-4 rounded-xl bg-zinc-900/80 border transition-all duration-200 cursor-pointer overflow-hidden ${
        isActive
          ? "border-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.15)] ring-1 ring-[#00FF66]/30"
          : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900"
      } ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <RobotAvatar
          avatarKey={robot.avatarKey}
          displayName={robot.displayName}
          status={robot.status}
          size="md"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-white tracking-wide">
                🤖 {robot.displayName}
              </span>
            </div>
            {getStatusBadge(robot.status)}
          </div>

          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {robot.role}
          </p>

          {/* Current Task or Tool */}
          {robot.currentTask ? (
            <p className="text-xs text-zinc-300 truncate mt-2 bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/80">
              <span className="text-zinc-500 font-mono">Task: </span>
              {robot.currentTask}
            </p>
          ) : (
            <p className="text-xs text-zinc-500 truncate mt-2 italic">
              Awaiting next outcome delegation
            </p>
          )}

          {/* Real Tool Visibility */}
          {activeTool && activeTool.status === "RUNNING" && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded">
              <Wrench className="w-3 h-3 animate-spin text-[#00FF66]" />
              <span className="font-mono truncate">{activeTool.toolName}</span>
            </div>
          )}

          {/* Handoff Status */}
          {robot.handoffState && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-400">
              <ArrowRight className="w-3 h-3 text-emerald-400" />
              <span className="truncate">Handoff: {robot.handoffState.summary}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
