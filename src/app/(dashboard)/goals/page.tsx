"use client";

import React, { useState, useEffect } from "react";
import { Target, Plus, CheckCircle, TrendingUp, Calendar, Clock, AlertCircle } from "lucide-react";
import { GoalService } from "@/services/goal.service";
import { GoalRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function GoalsPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function initAuth() {
      const auth = AuthService.getInstance();
      const sess = await auth.getSession();
      if (sess?.activeOrganizationId) setOrgId(sess.activeOrganizationId);
      if (sess?.user?.id) setUserId(sess.user.id);
    }
    initAuth();
  }, []);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("Qualified Leads");
  const [target, setTarget] = useState("100");
  const [deadline, setDeadline] = useState("");

  const goalService = GoalService.getInstance();

  useEffect(() => {
    loadGoals();
  }, [orgId, userId]);

  async function loadGoals() {
    try {
      const data = await goalService.getGoals(userId, orgId);
      setGoals(data);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await goalService.createGoal({
        userId,
        organizationId: orgId,
        title,
        description,
        metric,
        target: parseFloat(target) || 100,
        currentValue: 0,
        deadline: deadline || undefined,
      });

      setTitle("");
      setDescription("");
      setIsModalOpen(false);
      await loadGoals();
    } catch (err) {
      console.error("Failed to create goal:", err);
    }
  };

  const handleIncrement = async (goal: GoalRow, increment = 10) => {
    const current = goal.current_value || 0;
    const nextVal = current + increment;
    await goalService.updateGoalProgress({
      userId,
      organizationId: orgId,
      goalId: goal.id,
      currentValue: nextVal,
    });
    await loadGoals();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Target className="w-5 h-5" />
            </div>
            Strategic Business Goals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track business targets, lead benchmarks, and deliverables orchestrated by ELMO Central Brain.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Create Goal
        </button>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading strategic goals...</div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto mb-4 text-xl">
            🎯
          </div>
          <h3 className="text-lg font-bold text-white">No active goals yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Create a strategic business goal or ask ELMO in chat: &quot;Target 100 leads this month&quot;.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-all"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const current = goal.current_value || 0;
            const targetVal = goal.target || 100;
            const percent = Math.min(100, Math.round((current / targetVal) * 100));
            const isCompleted = goal.status === "COMPLETED" || percent >= 100;

            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isCompleted
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-950/40 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {goal.status}
                    </span>
                    {goal.deadline && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(goal.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">
                        {current} / {targetVal} {goal.metric || "Units"}
                      </span>
                      <span className="text-amber-400 font-bold">{percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-orange-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(goal.created_at).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => handleIncrement(goal, 10)}
                    disabled={isCompleted}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 disabled:opacity-50 transition-all border border-slate-700"
                  >
                    +10 {goal.metric || "Progress"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Create Strategic Business Goal
            </h2>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Generate 100 Qualified Coaching Leads"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Strategic background or campaign context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Metric</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leads, Bookings, Sales"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
