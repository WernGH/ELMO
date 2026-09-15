"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ShieldAlert, Check, X, Eye, AlertTriangle } from "lucide-react";

export interface ApprovalRequest {
  id: string;
  action: string;
  requestedBy: string;
  category: string;
  riskLevel: "Low" | "Medium" | "High";
  timestamp: string;
  details?: string;
  status?: "pending" | "approved" | "rejected";
}

export interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onReview?: (id: string) => void;
  className?: string;
}

export function ApprovalCard({
  request,
  onApprove,
  onReject,
  onReview,
  className,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    request.status || "pending"
  );

  const handleApprove = () => {
    setStatus("approved");
    onApprove?.(request.id);
  };

  const handleReject = () => {
    setStatus("rejected");
    onReject?.(request.id);
  };

  const riskStyles = {
    Low: "text-cyan-300 border-cyan-500/30 bg-cyan-950/30",
    Medium: "text-blue-300 border-blue-500/30 bg-blue-950/30",
    High: "text-rose-400 border-rose-500/30 bg-rose-950/30",
  }[request.riskLevel];

  return (
    <div
      className={cn(
        "rounded-xl bg-[#070D18]/90 backdrop-blur-md border border-[#14233A] p-4 transition-all duration-300",
        status === "pending" && "hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,210,255,0.12)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                {request.requestedBy}
              </span>
              <span className="text-[10px] text-zinc-600">•</span>
              <span className="text-[10px] font-mono text-zinc-500">
                {request.timestamp}
              </span>
            </div>

            <h4 className="text-sm font-semibold text-white font-sans">
              {request.action}
            </h4>

            {request.details && (
              <p className="text-xs text-zinc-300 font-sans leading-relaxed mt-1">
                {request.details}
              </p>
            )}
          </div>
        </div>

        {/* Risk Level Badge */}
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border shrink-0",
            riskStyles
          )}
        >
          {request.riskLevel} Risk
        </span>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-[#14233A] flex items-center justify-between gap-2">
        <button
          onClick={() => onReview?.(request.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 bg-[#0E1A2E] border border-[#1B3254] hover:text-white hover:border-cyan-500/50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          Review
        </button>

        {status === "pending" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono text-rose-300 bg-rose-950/30 border border-rose-500/30 hover:bg-rose-900/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
            <button
              onClick={handleApprove}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,210,255,0.4)] active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </button>
          </div>
        ) : status === "approved" ? (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-cyan-300 font-semibold">
            <Check className="w-3.5 h-3.5" /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-rose-400 font-semibold">
            <X className="w-3.5 h-3.5" /> Rejected
          </span>
        )}
      </div>
    </div>
  );
}
