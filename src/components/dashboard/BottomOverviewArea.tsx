"use client";

import React from "react";
import {
  Target,
  CheckSquare,
  Sparkles,
  Users,
  TrendingUp,
  Clock,
  Lightbulb,
  ArrowRight,
  Activity,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricItem {
  id: string;
  label: string;
  value: string;
  subtext: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "blue" | "cyan" | "electric";
}

const METRICS: MetricItem[] = [
  {
    id: "leads",
    label: "LEADS",
    value: "38",
    subtext: "Qualified pipeline prospects",
    change: "+12% this week",
    icon: Target,
    accent: "blue",
  },
  {
    id: "tasks",
    label: "TASKS",
    value: "12",
    subtext: "4 active, 8 scheduled",
    change: "Execution on schedule",
    icon: CheckSquare,
    accent: "electric",
  },
  {
    id: "goals",
    label: "GOALS",
    value: "3",
    subtext: "Autonomous revenue sprints",
    change: "85% velocity",
    icon: Sparkles,
    accent: "cyan",
  },
  {
    id: "employees",
    label: "AI EMPLOYEES",
    value: "7",
    subtext: "Specialist workforce standby",
    change: "All 7 operational",
    icon: Users,
    accent: "blue",
  },
];

interface RecentActivityItem {
  id: string;
  time: string;
  title: string;
  agent: string;
  status: "completed" | "in_progress" | "scheduled";
}

const RECENT_ACTIVITIES: RecentActivityItem[] = [
  {
    id: "act-1",
    time: "2m ago",
    title: "Market research analysis compiled for luxury real estate ICP",
    agent: "AURA-1 (Research)",
    status: "completed",
  },
  {
    id: "act-2",
    time: "14m ago",
    title: "Drafted 5 multi-channel ad variants for Meta campaign",
    agent: "NEXUS-2 (Marketing)",
    status: "completed",
  },
  {
    id: "act-3",
    time: "32m ago",
    title: "Lead scoring pipeline refreshed — 6 new high-intent contacts",
    agent: "VECTOR-4 (Sales)",
    status: "completed",
  },
  {
    id: "act-4",
    time: "1h ago",
    title: "Webhook connectivity health audit executed",
    agent: "SYNTAX-7 (Dev)",
    status: "completed",
  },
];

interface UpcomingTaskItem {
  id: string;
  dueTime: string;
  title: string;
  priority: "HIGH" | "MEDIUM" | "NORMAL";
  assignee: string;
}

const UPCOMING_TASKS: UpcomingTaskItem[] = [
  {
    id: "task-1",
    dueTime: "11:00 AM",
    title: "Automated executive summary generation for weekly pipeline",
    priority: "HIGH",
    assignee: "ELMO Core",
  },
  {
    id: "task-2",
    dueTime: "01:30 PM",
    title: "Meta Ads budget optimization review ($500/mo allocation)",
    priority: "MEDIUM",
    assignee: "NEXUS-2",
  },
  {
    id: "task-3",
    dueTime: "03:00 PM",
    title: "CRM contact enrichment batch sync with Supabase RLS",
    priority: "NORMAL",
    assignee: "VECTOR-4",
  },
];

interface BottomOverviewAreaProps {
  onAskELMO?: (prompt: string) => void;
  className?: string;
}

export function BottomOverviewArea({ onAskELMO, className }: BottomOverviewAreaProps) {
  return (
    <div className={cn("space-y-6 select-none", className)}>
      {/* 1. 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              className="relative p-5 rounded-2xl bg-[#060D1A]/95 border border-[#14233D] hover:border-cyan-500/40 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] group overflow-hidden"
            >
              {/* Corner Cyber Accent */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/40 group-hover:border-cyan-400 transition-colors" />

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                  {metric.label}
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#0B1526] border border-[#162947] flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-500/50 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-3xl font-black font-mono text-white tracking-tight group-hover:text-cyan-200 transition-colors">
                  {metric.value}
                </div>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">{metric.subtext}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-[#121E33] flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  {metric.change}
                </span>
                <span className="text-zinc-500">LIVE SYNC</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. ELMO Insights Featured Banner */}
      <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#07132B] via-[#091838] to-[#07132B] border border-cyan-500/40 shadow-[0_0_30px_rgba(0,210,255,0.15)] overflow-hidden">
        {/* Glowing background aura */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_15px_rgba(0,210,255,0.3)]">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-widest">
                  ELMO STRATEGIC INSIGHT
                </span>
                <span className="text-[10px] font-mono text-zinc-400">HIGH PRIORITY SIGNAL</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 font-sans">
                Prime opportunity detected in your current lead pipeline.
              </h3>
              <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed font-sans">
                VECTOR-4 identified 8 uncontacted enterprise leads matching our highest-converting customer profile. Initiating outreach today could accelerate our monthly goal completion by 24%.
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              onAskELMO &&
              onAskELMO(
                "ELMO, tell me more about the prime opportunity detected in our lead pipeline and how to act on it."
              )
            }
            className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-mono font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_16px_rgba(0,210,255,0.4)] active:scale-95"
          >
            <span>Ask ELMO to Elaborate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Operational Split: Recent Activity & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="p-5 rounded-2xl bg-[#060D1A]/95 border border-[#14233D] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#14233D]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                RECENT ACTIVITY
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
              REAL-TIME
            </span>
          </div>

          <div className="mt-3.5 space-y-3">
            {RECENT_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-xl bg-[#091222] border border-[#162A48] flex items-start justify-between gap-3 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-[0_0_6px_#00D2FF]" />
                  <div>
                    <p className="text-xs font-sans text-zinc-200 leading-snug">{act.title}</p>
                    <span className="text-[10px] font-mono text-cyan-400 mt-0.5 inline-block">
                      {act.agent}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="p-5 rounded-2xl bg-[#060D1A]/95 border border-[#14233D] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#14233D]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                UPCOMING TASKS
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
              SCHEDULED
            </span>
          </div>

          <div className="mt-3.5 space-y-3">
            {UPCOMING_TASKS.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-[#091222] border border-[#162A48] flex items-start justify-between gap-3 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-sans text-zinc-200 leading-snug">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-zinc-400">{task.assignee}</span>
                      <span
                        className={cn(
                          "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border",
                          task.priority === "HIGH"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : task.priority === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                        )}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 shrink-0">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{task.dueTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
