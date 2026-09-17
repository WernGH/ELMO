"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Check, X, Edit3, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { ApprovalService } from "@/services/approval.service";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { ApprovalRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function ApprovalsPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "modified">("pending");
  const [loading, setLoading] = useState(true);

  // Modify Modal State
  const [modifyTarget, setModifyTarget] = useState<ApprovalRow | null>(null);
  const [modifyNotes, setModifyNotes] = useState("");

  const approvalService = ApprovalService.getInstance();
  const orchestrator = ElmoOrchestratorService.getInstance();

  useEffect(() => {
    async function initAuth() {
      const auth = AuthService.getInstance();
      const sess = await auth.getSession();
      if (sess?.activeOrganizationId) setOrgId(sess.activeOrganizationId);
      if (sess?.user?.id) setUserId(sess.user.id);
    }
    initAuth();
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [orgId, userId, filter]);

  async function loadApprovals() {
    setLoading(true);
    try {
      const list = await approvalService.getApprovals(userId, orgId, filter);
      setApprovals(list);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (approval: ApprovalRow) => {
    try {
      await approvalService.approve(approval.id, userId, orgId);
      if (approval.execution_id) {
        try {
          await orchestrator.handleApprovalDecision(approval.execution_id, "approve", {
            userId,
            organizationId: orgId,
          });
        } catch {
          // Non-blocking if execution finished or offline
        }
      }
      await loadApprovals();
    } catch (err) {
      console.error("Failed to approve:", err);
    }
  };

  const handleCancel = async (approval: ApprovalRow) => {
    try {
      await approvalService.cancel(approval.id, userId, orgId, "Rejected by user");
      if (approval.execution_id) {
        try {
          await orchestrator.handleApprovalDecision(approval.execution_id, "cancel", {
            userId,
            organizationId: orgId,
          });
        } catch {
          // Non-blocking
        }
      }
      await loadApprovals();
    } catch (err) {
      console.error("Failed to cancel approval:", err);
    }
  };

  const handleOpenModify = (approval: ApprovalRow) => {
    setModifyTarget(approval);
    setModifyNotes("");
  };

  const submitModify = async () => {
    if (!modifyTarget || !modifyNotes.trim()) return;
    try {
      await approvalService.modify(modifyTarget.id, userId, orgId, modifyNotes);
      if (modifyTarget.execution_id) {
        try {
          await orchestrator.handleApprovalDecision(modifyTarget.execution_id, "modify", {
            userId,
            organizationId: orgId,
            modificationNotes: modifyNotes,
          });
        } catch {
          // Non-blocking
        }
      }
      setModifyTarget(null);
      await loadApprovals();
    } catch (err) {
      console.error("Failed to submit modification:", err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            Executive Approvals (Human-in-the-Loop)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review high-risk actions, public deployments, and critical business decisions escalated by ELMO.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-mono">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "pending" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-400"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "approved" ? "bg-slate-800 text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "rejected" ? "bg-slate-800 text-rose-400 font-bold" : "text-slate-400"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading executive approvals...</div>
      ) : approvals.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No {filter} approvals</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            {filter === "pending"
              ? "All AI workforce actions are operating within permitted safety parameters."
              : `No ${filter} approval records found in your organization history.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((appr) => {
            const riskStyles = {
              Low: "text-cyan-400 border-cyan-500/30 bg-cyan-950/30",
              Medium: "text-amber-400 border-amber-500/30 bg-amber-950/30",
              High: "text-rose-400 border-rose-500/30 bg-rose-950/30",
            }[appr.risk_level || "Medium"];

            return (
              <div
                key={appr.id}
                className="rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                      <span className="text-slate-400 uppercase tracking-wider">{appr.requested_by}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500">{new Date(appr.created_at).toLocaleString()}</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{appr.action}</h3>

                    {appr.details && (
                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{appr.details}</p>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border shrink-0 ${riskStyles}`}
                  >
                    {appr.risk_level} Risk
                  </span>
                </div>

                {/* Proposed Changes Preview */}
                {appr.proposed_changes && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-36">
                    <pre>{JSON.stringify(appr.proposed_changes, null, 2)}</pre>
                  </div>
                )}

                {/* Interactive Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    Status: <strong className="uppercase text-slate-300">{appr.status}</strong>
                  </span>

                  {appr.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCancel(appr)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleOpenModify(appr)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        Modify
                      </button>
                      <button
                        onClick={() => handleApprove(appr)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve & Proceed
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">
                      Decided on {appr.decided_at ? new Date(appr.decided_at).toLocaleString() : "N/A"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modify Modal */}
      {modifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              Request Modifications Before Approval
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Instruct ELMO on changes needed for &quot;{modifyTarget.action}&quot;. ELMO will replan automatically.
            </p>

            <textarea
              rows={4}
              required
              placeholder="e.g. Change the primary CTA to WhatsApp and make sure colors use warm luxury gold..."
              value={modifyNotes}
              onChange={(e) => setModifyNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModifyTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitModify}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider"
              >
                Submit & Replan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
