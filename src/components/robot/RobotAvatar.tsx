"use client";

import React from "react";
import { RobotStatus } from "@/services/agentic/types/agentic.types";

interface RobotAvatarProps {
  avatarKey: string;
  displayName: string;
  status?: RobotStatus;
  size?: "sm" | "md" | "lg" | "xl";
  showStatusIndicator?: boolean;
  className?: string;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  avatarKey,
  displayName,
  status = "READY",
  size = "md",
  showStatusIndicator = true,
  className = "",
}) => {
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
    xl: "w-24 h-24 text-xl",
  };

  const statusColorMap: Record<RobotStatus, { ring: string; dot: string; glow: string }> = {
    READY: { ring: "border-emerald-500/40", dot: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]" },
    THINKING: { ring: "border-cyan-500/60 animate-pulse", dot: "bg-cyan-400", glow: "shadow-[0_0_15px_rgba(6,182,212,0.4)]" },
    WORKING: { ring: "border-[#00FF66]/80 animate-pulse", dot: "bg-[#00FF66]", glow: "shadow-[0_0_18px_rgba(0,255,102,0.5)]" },
    VERIFYING: { ring: "border-purple-500/70 animate-pulse", dot: "bg-purple-400", glow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]" },
    WAITING: { ring: "border-amber-500/60", dot: "bg-amber-400", glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]" },
    BLOCKED: { ring: "border-rose-500/80 animate-pulse", dot: "bg-rose-500", glow: "shadow-[0_0_15px_rgba(244,63,94,0.4)]" },
    COMPLETE: { ring: "border-emerald-400", dot: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(52,211,153,0.3)]" },
    COMPLETED: { ring: "border-emerald-400", dot: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(52,211,153,0.3)]" },
    USING_TOOL: { ring: "border-blue-500/70 animate-pulse", dot: "bg-blue-400", glow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]" },
    ERROR: { ring: "border-red-600 animate-pulse", dot: "bg-red-500", glow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]" },
    APPROVAL_REQUIRED: { ring: "border-amber-400 animate-bounce", dot: "bg-amber-400", glow: "shadow-[0_0_15px_rgba(251,191,36,0.5)]" },
  };

  const statusStyle = statusColorMap[status] || statusColorMap.READY;

  // Custom digital face features per robot
  const renderRobotFace = () => {
    switch (avatarKey.toLowerCase()) {
      case "elmo":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            {/* Outer Head Frame */}
            <rect x="18" y="20" width="64" height="60" rx="14" fill="#0D1410" stroke="#00FF66" strokeWidth="2.5" />
            {/* Executive Crown Ring */}
            <path d="M30 18 L50 10 L70 18" stroke="#00FF66" strokeWidth="2" strokeLinecap="round" />
            {/* Digital Visor */}
            <rect x="25" y="32" width="50" height="22" rx="6" fill="#041208" stroke="#10B981" strokeWidth="1.5" />
            {/* Dual Glowing Ocular Cores */}
            <circle cx="40" cy="43" r="5" fill="#00FF66" className={status === "WORKING" ? "animate-ping" : ""} />
            <circle cx="60" cy="43" r="5" fill="#00FF66" className={status === "WORKING" ? "animate-ping" : ""} />
            <line x1="32" y1="64" x2="68" y2="64" stroke="#00FF66" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        );

      case "nova": // Research Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0B130E" stroke="#10B981" strokeWidth="2.5" />
            {/* Telescopic Scanning Lens */}
            <circle cx="50" cy="45" r="16" fill="#041409" stroke="#00FF66" strokeWidth="1.5" />
            <circle cx="50" cy="45" r="8" fill="#10B981" />
            <circle cx="50" cy="45" r="3" fill="#FFFFFF" />
            {/* Scanner Wave */}
            <path d="M32 68 Q50 63 68 68" stroke="#00FF66" strokeWidth="2" />
          </svg>
        );

      case "atlas": // Analytics Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0A1211" stroke="#06B6D4" strokeWidth="2.5" />
            {/* Analytics Grid Visor */}
            <rect x="27" y="34" width="46" height="20" rx="4" fill="#021517" stroke="#22D3EE" strokeWidth="1.5" />
            <line x1="35" y1="48" x2="35" y2="40" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" />
            <line x1="45" y1="48" x2="45" y2="37" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" />
            <line x1="55" y1="48" x2="55" y2="44" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" />
            <line x1="65" y1="48" x2="65" y2="39" stroke="#00FF66" strokeWidth="3" strokeLinecap="round" />
            <path d="M32 66 L68 66" stroke="#06B6D4" strokeWidth="2" strokeDasharray="2 3" />
          </svg>
        );

      case "codex": // Web & Coding Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0C140F" stroke="#10B981" strokeWidth="2.5" />
            {/* Code Brackets Eyes < / > */}
            <path d="M38 38 L30 44 L38 50" stroke="#00FF66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M62 38 L70 44 L62 50" stroke="#00FF66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="48" y1="52" x2="52" y2="36" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <rect x="34" y="64" width="32" height="4" rx="2" fill="#00FF66" />
          </svg>
        );

      case "grow": // Marketing Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0D1610" stroke="#10B981" strokeWidth="2.5" />
            {/* Growth Arrow Vector */}
            <path d="M32 50 L46 38 L58 46 L70 34" stroke="#00FF66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M64 34 L70 34 L70 40" stroke="#00FF66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="40" cy="62" r="3" fill="#10B981" />
            <circle cx="60" cy="62" r="3" fill="#10B981" />
          </svg>
        );

      case "copy": // Copywriting Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0C1410" stroke="#34D399" strokeWidth="2.5" />
            {/* Horizontal Text Visor */}
            <rect x="28" y="34" width="44" height="18" rx="4" fill="#03140A" stroke="#10B981" strokeWidth="1.5" />
            <line x1="34" y1="41" x2="66" y2="41" stroke="#00FF66" strokeWidth="2" strokeLinecap="round" />
            <line x1="34" y1="46" x2="56" y2="46" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="64" r="3" fill="#00FF66" />
          </svg>
        );

      case "sales": // Sales Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#111710" stroke="#059669" strokeWidth="2.5" />
            {/* Reticle Target */}
            <circle cx="50" cy="45" r="14" stroke="#00FF66" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="50" cy="45" r="5" fill="#10B981" />
            <line x1="50" y1="28" x2="50" y2="62" stroke="#10B981" strokeWidth="1.5" />
            <line x1="33" y1="45" x2="67" y2="45" stroke="#10B981" strokeWidth="1.5" />
          </svg>
        );

      case "strategy": // Strategy Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0E1611" stroke="#10B981" strokeWidth="2.5" />
            {/* Strategic Roadmap Nodes */}
            <circle cx="34" cy="44" r="5" fill="#00FF66" />
            <circle cx="50" cy="36" r="5" fill="#10B981" />
            <circle cx="66" cy="44" r="5" fill="#00FF66" />
            <line x1="38" y1="42" x2="46" y2="38" stroke="#00FF66" strokeWidth="2" />
            <line x1="54" y1="38" x2="62" y2="42" stroke="#00FF66" strokeWidth="2" />
            <rect x="36" y="62" width="28" height="3" rx="1.5" fill="#00FF66" />
          </svg>
        );

      case "automation": // Automation Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0A1412" stroke="#00FF66" strokeWidth="2.5" />
            {/* Lightning Circuit */}
            <path d="M52 28 L40 44 L48 44 L44 62 L58 46 L50 46 Z" fill="#00FF66" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="30" cy="45" r="3" fill="#10B981" />
            <circle cx="70" cy="45" r="3" fill="#10B981" />
          </svg>
        );

      case "support": // Support Worker
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0D1510" stroke="#10B981" strokeWidth="2.5" />
            {/* Friendly Visor with Headset */}
            <rect x="28" y="36" width="44" height="18" rx="6" fill="#031409" stroke="#00FF66" strokeWidth="1.5" />
            <circle cx="39" cy="45" r="4" fill="#00FF66" />
            <circle cx="61" cy="45" r="4" fill="#00FF66" />
            <path d="M42 63 Q50 67 58 63" stroke="#00FF66" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 45 Q16 26 50 26 Q84 26 84 45" stroke="#10B981" strokeWidth="2" fill="none" />
          </svg>
        );

      case "ops": // Operations Worker
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect x="20" y="22" width="60" height="56" rx="12" fill="#0C1410" stroke="#10B981" strokeWidth="2.5" />
            {/* Gear / Process Hub */}
            <circle cx="50" cy="45" r="12" stroke="#00FF66" strokeWidth="2" strokeDasharray="6 3" />
            <circle cx="50" cy="45" r="5" fill="#10B981" />
            <line x1="32" y1="65" x2="68" y2="65" stroke="#00FF66" strokeWidth="2" />
          </svg>
        );
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Robot Face Housing */}
      <div
        className={`${sizeMap[size]} rounded-2xl bg-zinc-950 border ${statusStyle.ring} ${statusStyle.glow} flex items-center justify-center overflow-hidden transition-all duration-300`}
        title={`${displayName} (${status})`}
      >
        {renderRobotFace()}
      </div>

      {/* Real-time Status Indicator Dot */}
      {showStatusIndicator && (
        <span
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950 ${statusStyle.dot}`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
