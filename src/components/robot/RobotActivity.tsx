import React from "react";
import { WorkerActivityRecord, RobotMessage } from "@/services/agentic/types/agentic.types";

interface RobotActivityProps {
  activities?: WorkerActivityRecord[];
  messages?: RobotMessage[];
  className?: string;
}

export function RobotActivity({
  activities = [],
  messages = [],
  className = "",
}: RobotActivityProps) {
  // Combine activity records and messages chronologically
  const items: Array<{
    id: string;
    type: string;
    title: string;
    details?: string;
    timestamp: number;
    badgeColor: string;
  }> = [];

  for (const act of activities) {
    let color = "bg-slate-800 text-slate-400 border-slate-700";
    if (act.eventType.includes("TOOL")) color = "bg-blue-500/10 text-blue-400 border-blue-500/30";
    if (act.eventType.includes("STARTED")) color = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    if (act.eventType.includes("COMPLETED")) color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (act.eventType.includes("BLOCKED")) color = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    if (act.eventType.includes("HANDOFF")) color = "bg-purple-500/10 text-purple-400 border-purple-500/30";
    if (act.eventType.includes("APPROVAL")) color = "bg-amber-500/10 text-amber-400 border-amber-500/30";

    items.push({
      id: act.id,
      type: act.eventType.replace(/_/g, " "),
      title: act.eventType.replace(/_/g, " "),
      details: act.metadata ? JSON.stringify(act.metadata) : undefined,
      timestamp: act.timestamp,
      badgeColor: color,
    });
  }

  for (const msg of messages) {
    items.push({
      id: msg.messageId,
      type: msg.eventType.replace(/_/g, " "),
      title: `${msg.fromRobotName}: ${msg.messageText}`,
      timestamp: msg.timestamp,
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    });
  }

  items.sort((a, b) => b.timestamp - a.timestamp);

  if (items.length === 0) {
    return (
      <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic ${className}`}>
        No live execution activity recorded for this worker yet.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.slice(0, 15).map((item) => (
        <div
          key={item.id}
          className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-2.5 text-xs"
        >
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border flex-shrink-0 mt-0.5 ${item.badgeColor}`}
          >
            {item.type}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 font-medium leading-relaxed">
              {item.title}
            </p>
            {item.details && (
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                {item.details}
              </p>
            )}
          </div>
          <span className="text-[10px] text-slate-500 flex-shrink-0">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}
