"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { Target, CheckCircle2, Clock, ArrowRight, ShieldCheck } from "lucide-react";

export interface MissionSubTask {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
}

export interface MissionCardProps {
  title?: string;
  objective?: string;
  progress?: number;
  completedTasks?: number;
  totalTasks?: number;
  nextAction?: string;
  subtasks?: MissionSubTask[];
  className?: string;
}

export function MissionCard({
  title = "ACTIVE STRATEGIC MISSION",
  objective = "Generate 20 qualified property leads",
  progress = 74,
  completedTasks = 15,
  totalTasks = 20,
  nextAction = "Marketing Employee drafting ad campaign targeting high-net-worth investors",
  subtasks = [
    { id: "1", title: "Market research on regional property demand", completed: true, assignee: "Research Agent" },
    { id: "2", title: "Target audience ICP parameter formulation", completed: true, assignee: "ELMO" },
    { id: "3", title: "Draft high-converting ad copy & visuals", completed: false, assignee: "Content Agent" },
    { id: "4", title: "Deploy approved campaign to Meta Ads", completed: false, assignee: "Marketing Agent" },
  ],
  className,
}: MissionCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-[#070D18]/90 backdrop-blur-xl border border-cyan-500/30 p-5 shadow-[0_0_30px_rgba(0,210,255,0.1)] transition-all duration-300",
        className
      )}
    >
      {/* Corner cyber markings in Neon Cyan */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400 rounded-br-sm pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#14233A]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              {title}
            </span>
            <h3 className="text-base font-bold text-white font-sans">
              {objective}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1A2E] border border-[#1B355A] text-xs font-mono text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sprint #4</span>
        </div>
      </div>

      {/* Progress Section */}
      <div className="my-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Objective Velocity</span>
          <span className="text-cyan-200">
            {completedTasks} of {totalTasks} milestones achieved
          </span>
        </div>
        <PixelProgressBar value={progress} color="blue" totalBlocks={24} size="md" />
      </div>

      {/* Next Action Broadcast */}
      <div className="p-3 rounded-lg bg-[#0A1424]/90 border border-cyan-500/25 mb-4 flex items-start gap-2.5">
        <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block">
            Next Autonomous Execution
          </span>
          <p className="text-xs text-zinc-200 font-sans mt-0.5">
            {nextAction}
          </p>
        </div>
      </div>

      {/* Subtasks Milestones */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Milestone Breakdown
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {subtasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center justify-between gap-2 p-2 rounded-md border text-xs font-mono transition-colors",
                task.completed
                  ? "bg-[#081220]/70 border-cyan-500/20 text-zinc-200"
                  : "bg-[#060D18]/70 border-[#14233A] text-zinc-400"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                {task.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />
                )}
                <span className={cn("truncate", task.completed && "line-through text-zinc-500")}>
                  {task.title}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 shrink-0">
                {task.assignee}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
