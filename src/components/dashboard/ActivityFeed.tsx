"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Activity, ShieldCheck, FileText, Flame, Terminal, CheckCircle2 } from "lucide-react";

export interface ActivityEvent {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: "system" | "research" | "content" | "sales" | "approval" | "dev";
}

export interface ActivityFeedProps {
  events?: ActivityEvent[];
  className?: string;
  maxEvents?: number;
}

const DEFAULT_EVENTS: ActivityEvent[] = [
  {
    id: "act-1",
    timestamp: "Just now",
    source: "SALES AGENT",
    message: "Identified and qualified 2 high-intent enterprise property leads",
    type: "sales",
  },
  {
    id: "act-2",
    timestamp: "8m ago",
    source: "CONTENT AGENT",
    message: "Synthesized 5 SEO-optimized landing page variants for campaign",
    type: "content",
  },
  {
    id: "act-3",
    timestamp: "24m ago",
    source: "RESEARCH AGENT",
    message: "Completed comprehensive regional real estate competitor analysis",
    type: "research",
  },
  {
    id: "act-4",
    timestamp: "1h ago",
    source: "ELMO AI CEO",
    message: "Orchestrated Q3 expansion directive across all specialist units",
    type: "system",
  },
  {
    id: "act-5",
    timestamp: "2h ago",
    source: "SYSTEM KERNEL",
    message: "Multi-tenant tenant isolated sandbox initialized successfully",
    type: "dev",
  },
];

export function ActivityFeed({
  events = DEFAULT_EVENTS,
  className,
  maxEvents = 6,
}: ActivityFeedProps) {
  const displayEvents = events.slice(0, maxEvents);

  const typeConfig = {
    system: { dot: "bg-cyan-400 shadow-[0_0_6px_#00D2FF]", icon: Terminal, color: "text-cyan-300" },
    sales: { dot: "bg-blue-400 shadow-[0_0_6px_#0084FF]", icon: Flame, color: "text-blue-300" },
    content: { dot: "bg-cyan-300 shadow-[0_0_6px_#70F2FF]", icon: FileText, color: "text-cyan-200" },
    research: { dot: "bg-sky-400 shadow-[0_0_6px_#38BDF8]", icon: CheckCircle2, color: "text-sky-300" },
    approval: { dot: "bg-teal-400 shadow-[0_0_6px_#2DD4BF]", icon: ShieldCheck, color: "text-teal-300" },
    dev: { dot: "bg-zinc-400", icon: Activity, color: "text-zinc-400" },
  };

  return (
    <div className={cn("space-y-3 font-mono", className)}>
      <div className="flex items-center justify-between text-xs pb-2 border-b border-[#14233A]">
        <div className="flex items-center gap-2 text-zinc-400">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] uppercase tracking-wider text-zinc-300">Live System Stream</span>
        </div>
        <span className="text-[10px] text-cyan-400 font-bold">● 5 SEC HEARTBEAT</span>
      </div>

      <div className="space-y-2">
        {displayEvents.map((evt) => {
          const cfg = typeConfig[evt.type] || typeConfig.system;
          return (
            <div
              key={evt.id}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-[#070D18]/70 border border-[#132238] hover:border-[#1E3658] transition-colors"
            >
              <div className="mt-1 flex items-center justify-center shrink-0">
                <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-[10px] font-bold tracking-wider", cfg.color)}>
                    {evt.source}
                  </span>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    {evt.timestamp}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                  {evt.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
