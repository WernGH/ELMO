"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface AIEmployee {
  id: string;
  role: string;
  codename: string;
  category: string;
  status: "STANDBY" | "ACTIVE" | "IDLE";
  icon: LucideIcon;
  capabilities: string[];
  avatarBg?: string;
  accentColor?: string;
}

export interface EmployeeCardProps {
  employee: AIEmployee;
  onDeploy?: (employee: AIEmployee) => void;
  className?: string;
}

export function EmployeeCard({
  employee,
  onDeploy,
  className,
}: EmployeeCardProps) {
  const Icon = employee.icon;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-xl bg-[#070D18]/90 backdrop-blur-md border border-[#14233A] p-4 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,210,255,0.18)] group",
        className
      )}
    >
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between gap-2">
          {/* Avatar Icon */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#0E1B2E] border border-[#1D365A] text-cyan-300 group-hover:border-cyan-400/60 group-hover:text-cyan-200 transition-colors">
              <Icon className="w-5 h-5" />
              {/* Standby Status indicator dot */}
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 border border-[#070D18] shadow-[0_0_6px_#00D2FF]" />
              </span>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors font-sans">
                {employee.role}
              </h4>
              <p className="text-[11px] font-mono text-zinc-400">
                {employee.codename} • {employee.category}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {employee.status}
          </span>
        </div>

        {/* Capabilities preview */}
        <div className="mt-3.5 space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Specializations
          </p>
          <div className="flex flex-wrap gap-1">
            {employee.capabilities.map((cap, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-[#0B1526] border border-[#182C48] text-[10px] font-mono text-zinc-300"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Deploy CTA */}
      <div className="mt-4 pt-3 border-t border-[#14233A] flex items-center justify-between text-xs font-mono">
        <span className="text-[11px] text-zinc-500">
          Under ELMO Command
        </span>
        <button
          onClick={() => onDeploy?.(employee)}
          className="px-2.5 py-1 rounded text-[11px] font-medium border border-[#1C3252] bg-[#0E1B2E] text-zinc-300 hover:text-cyan-200 hover:border-cyan-400/50 hover:bg-cyan-950/30 transition-all duration-200"
        >
          Assign Task
        </button>
      </div>
    </div>
  );
}
