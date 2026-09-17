"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, Plus, Bot, User, Clock, AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { TaskService } from "@/services/task.service";
import { TaskRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function TasksPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOwner, setFilterOwner] = useState<"ALL" | "AI" | "HUMAN">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerType, setOwnerType] = useState<"AI" | "HUMAN">("AI");
  const [ownerName, setOwnerName] = useState("Web/Coding Agent");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  const taskService = TaskService.getInstance();

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
    loadTasks();
  }, [orgId, userId]);

  async function loadTasks() {
    try {
      const data = await taskService.getTasks(userId, orgId);
      setTasks(data);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await taskService.createTask({
        userId,
        organizationId: orgId,
        title,
        description,
        ownerType,
        ownerName,
        priority,
      });

      setTitle("");
      setDescription("");
      setIsModalOpen(false);
      await loadTasks();
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleToggleStatus = async (task: TaskRow) => {
    const nextStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    await taskService.updateTaskStatus(userId, orgId, task.id, nextStatus);
    await loadTasks();
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterOwner === "ALL") return true;
    return t.owner_type === filterOwner;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            Workforce Task Pipeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Operational deliverables delegated by ELMO to AI specialist employees and human collaborators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Owner Filter */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-mono">
            <button
              onClick={() => setFilterOwner("ALL")}
              className={`px-3 py-1 rounded-lg transition-all ${filterOwner === "ALL" ? "bg-slate-800 text-white font-bold" : "text-slate-400"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterOwner("AI")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${filterOwner === "AI" ? "bg-slate-800 text-cyan-400 font-bold" : "text-slate-400"}`}
            >
              <Bot className="w-3.5 h-3.5" /> AI
            </button>
            <button
              onClick={() => setFilterOwner("HUMAN")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${filterOwner === "HUMAN" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-400"}`}
            >
              <User className="w-3.5 h-3.5" /> Human
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading task pipeline...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-800 text-cyan-400 flex items-center justify-center mx-auto mb-4 text-xl">
            📋
          </div>
          <h3 className="text-lg font-bold text-white">No tasks found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Tasks will be populated automatically when ELMO orchestrates campaigns or you create them manually.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-all"
          >
            Add Manual Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";
            const priorityColors = {
              LOW: "text-slate-400 border-slate-700 bg-slate-800/50",
              MEDIUM: "text-blue-400 border-blue-500/30 bg-blue-950/30",
              HIGH: "text-amber-400 border-amber-500/30 bg-amber-950/30",
              URGENT: "text-rose-400 border-rose-500/30 bg-rose-950/30",
            }[task.priority || "MEDIUM"];

            return (
              <div
                key={task.id}
                className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? "bg-slate-900/30 border-slate-800/60 opacity-70"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-slate-950"
                        : "border-slate-700 hover:border-cyan-400"
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div>
                    <h4 className={`text-sm font-bold text-white ${isCompleted ? "line-through text-slate-500" : ""}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-0.5 max-w-2xl line-clamp-1">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider border ${
                      task.owner_type === "AI"
                        ? "text-cyan-400 border-cyan-500/30 bg-cyan-950/30"
                        : "text-amber-400 border-amber-500/30 bg-amber-950/30"
                    }`}
                  >
                    {task.owner_type === "AI" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {task.owner_name}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider border ${priorityColors}`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              Create Workforce Task
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Mobile Responsive CSS & Contrast"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Task instructions and expected deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assignee Type</label>
                  <select
                    value={ownerType}
                    onChange={(e) => setOwnerType(e.target.value as "AI" | "HUMAN")}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="AI">AI Specialist</option>
                    <option value="HUMAN">Human Member</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assignee Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
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
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
