import React from "react";
import { RobotIdentity as RobotIdentityType } from "@/services/agentic/types/agentic.types";
import { RobotAvatar } from "./RobotAvatar";
import { RobotStatus } from "./RobotStatus";

interface RobotIdentityProps {
  robot: RobotIdentityType;
  showDetails?: boolean;
  avatarSize?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function RobotIdentity({
  robot,
  showDetails = true,
  avatarSize = "md",
  className = "",
}: RobotIdentityProps) {
  return (
    <div className={`flex items-start gap-3.5 ${className}`}>
      <RobotAvatar
        avatarKey={robot.avatarKey}
        displayName={robot.displayName}
        status={robot.status}
        size={avatarSize}
        showStatusIndicator={true}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-slate-100 text-sm tracking-wide flex items-center gap-1.5">
            <span>🤖</span>
            <span>{robot.displayName}</span>
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {robot.workerId}
          </span>
          <RobotStatus status={robot.status} compact />
        </div>

        <p className="text-xs text-emerald-400 font-medium mt-0.5">
          {robot.role}
        </p>

        {showDetails && robot.description && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {robot.description}
          </p>
        )}
      </div>
    </div>
  );
}
