"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  ArrowRightLeft,
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  Power,
  Search,
  SlidersHorizontal,
  FileCode,
  Sparkles,
  BarChart3,
  ExternalLink,
  Lock,
  Layers,
  Zap,
  UserPlus,
  Send,
  X,
  FileText,
  ChevronRight,
  RefreshCw,
  Info,
  Target,
  Bot,
} from "lucide-react";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { WorkerDefinition, WorkerHandoffContract, WorkerActivityRecord } from "@/services/agentic/types/agentic.types";
import { AuthService } from "@/services/auth.service";
import { OutcomeService } from "@/services/agentic/outcome.service";
import { RobotIdentityService } from "@/services/agentic/robot-identity.service";
import { DesiredOutcome, RobotIdentity } from "@/services/agentic/types/agentic.types";
import { RobotCard } from "@/components/robot/RobotCard";
import { RobotDetailModal } from "@/components/robot/RobotDetailModal";
import { OutcomeCard } from "@/components/outcome/OutcomeCard";
import { OutcomeExecutionGraph, ExecutionGraphNode } from "@/components/outcome/OutcomeExecutionGraph";
import { OutcomeResultScreen } from "@/components/outcome/OutcomeResultScreen";
import { OutcomeEntryModal } from "@/components/outcome/OutcomeEntryModal";
import { OutcomeWorkspace } from "@/components/outcome/OutcomeWorkspace";
import { OutcomeVoiceIntake } from "@/components/outcome/OutcomeVoiceIntake";

export default function WorkforcePage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");
  const [workers, setWorkers] = useState<WorkerDefinition[]>([]);
  const [handoffs, setHandoffs] = useState<WorkerHandoffContract[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"outcomes" | "robots" | "workers" | "handoffs" | "governance">("outcomes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedWorker, setSelectedWorker] = useState<WorkerDefinition | null>(null);

  // Phase 4.1: Outcome & Robot Identity States
  const [outcomes, setOutcomes] = useState<DesiredOutcome[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<DesiredOutcome | null>(null);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<RobotIdentity | null>(null);
  const [robots, setRobots] = useState<RobotIdentity[]>([]);

  // Phase 4 Deepening: Interactive Modal States
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [dispatchObjective, setDispatchObjective] = useState("");
  const [dispatchWorkerId, setDispatchWorkerId] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [dispatchError, setDispatchError] = useState("");

  const [inspectedHandoff, setInspectedHandoff] = useState<WorkerHandoffContract | null>(null);

  const [isCreateWorkerOpen, setIsCreateWorkerOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerRole, setNewWorkerRole] = useState("OPERATIONS");
  const [newWorkerDesc, setNewWorkerDesc] = useState("");
  const [newWorkerCaps, setNewWorkerCaps] = useState("");
  const [newWorkerCapacity, setNewWorkerCapacity] = useState(3);
  const [isCreatingWorker, setIsCreatingWorker] = useState(false);

  const [inspectedTelemetryWorker, setInspectedTelemetryWorker] = useState<WorkerDefinition | null>(null);
  const [workerActivities, setWorkerActivities] = useState<WorkerActivityRecord[]>([]);

  const agentRegistry = AgentRegistryService.getInstance();
  const workforceRegistry = WorkforceRegistryService.getInstance();

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
    loadWorkforceData();
  }, [orgId, userId]);

  function loadWorkforceData() {
    setLoading(true);
    try {
      const workerList = agentRegistry.getWorkers({ organizationId: orgId });
      const handoffList = workforceRegistry.getWorkerHandoffs(orgId);
      const perfMetrics = workforceRegistry.getWorkforcePerformanceMetrics(orgId);
      const outcomeService = OutcomeService.getInstance();
      const robotService = RobotIdentityService.getInstance();

      let outcomeList = outcomeService.listOutcomes(orgId);
      if (outcomeList.length === 0) {
        outcomeService
          .createOutcome({
            title: "Increase qualified leads by 30%",
            description: "Scale high-intent buyer acquisition through optimized positioning and automated follow-ups",
            organizationId: orgId,
            userId,
            targetMetric: { name: "Qualified Leads", targetValue: "+30%", currentValue: "+12%" },
            successCriteria: [
              "+30% qualified lead volume",
              "Maintain lead qualification quality",
              "Verified against current business telemetry",
            ],
          })
          .then((defaultOutcome) => {
            setOutcomes([defaultOutcome]);
            setSelectedOutcome(defaultOutcome);
          });
      } else {
        setOutcomes(outcomeList);
        if (!selectedOutcome && outcomeList.length > 0) {
          setSelectedOutcome(outcomeList[0]);
        }
      }

      setRobots(robotService.getAllRobots());
      setWorkers(workerList);
      setHandoffs(handoffList);
      setMetrics(perfMetrics);
    } catch (err) {
      console.error("Failed to load workforce state:", err);
    } finally {
      setLoading(false);
    }
  }

  // Phase 4.1 Handlers
  const handleCreateOutcome = async (title: string, targetMetric?: { name: string; targetValue: string }) => {
    const outcomeService = OutcomeService.getInstance();
    const newOutcome = await outcomeService.createOutcome({
      title,
      organizationId: orgId,
      userId,
      targetMetric,
    });
    setOutcomes((prev) => [newOutcome, ...prev]);
    setSelectedOutcome(newOutcome);
    setActiveTab("outcomes");
  };

  const handleStartOutcome = (outcomeId: string) => {
    const outcomeService = OutcomeService.getInstance();
    const started = outcomeService.startExecution(outcomeId, orgId);
    setSelectedOutcome(started);
    loadWorkforceData();
  };

  const handleApproveOutcome = (outcomeId: string) => {
    const outcomeService = OutcomeService.getInstance();
    const approved = outcomeService.approveOutcome(outcomeId, orgId);
    setSelectedOutcome(approved);
    loadWorkforceData();
  };

  const handleRejectOutcome = (outcomeId: string) => {
    const outcomeService = OutcomeService.getInstance();
    const rejected = outcomeService.rejectOutcome(outcomeId, orgId);
    setSelectedOutcome(rejected);
    loadWorkforceData();
  };

  const handleVerifyOutcome = (outcomeId: string) => {
    const outcomeService = OutcomeService.getInstance();
    const verified = outcomeService.verifyOutcome(outcomeId, orgId);
    setSelectedOutcome(verified);
    loadWorkforceData();
  };

  // Dynamic Execution Graph nodes derived from plan/milestones
  const graphNodes: ExecutionGraphNode[] = selectedOutcome
    ? selectedOutcome.assignedWorkers.map((name, idx) => {
        const robot = robots.find((r) => r.displayName.toLowerCase() === name.toLowerCase()) || {
          avatarKey: name.toLowerCase(),
          role: `${name} Specialist`,
          capabilities: [],
          tools: [],
        };
        const ms = selectedOutcome.milestones.find((m) => m.robotName?.toLowerCase() === name.toLowerCase());
        const status = ms ? ms.status : (idx === 0 ? "IN_PROGRESS" : "PENDING");
        const depId = idx > 0 ? `step-${idx - 1}` : "";
        return {
          id: `step-${idx}`,
          stepNumber: idx + 1,
          robotName: name,
          avatarKey: (robot as any).avatarKey || name.toLowerCase(),
          role: robot.role || "Specialist Worker",
          task: ms?.title || `Execute ${name} capabilities for ${selectedOutcome.title}`,
          status: status as any,
          dependencies: depId ? [depId] : [],
          tools: (robot as any).tools?.slice(0, 3) || [],
        };
      })
    : [];

  const handleToggleWorkerStatus = (worker: WorkerDefinition) => {
    try {
      if (worker.enabled) {
        agentRegistry.disableWorker(worker.id);
      } else {
        agentRegistry.enableWorker(worker.id);
      }
      loadWorkforceData();
    } catch (err) {
      console.error("Failed to toggle worker status:", err);
    }
  };

  const handlePauseWorker = (worker: WorkerDefinition) => {
    try {
      const newStatus = worker.status === "PAUSED" ? "AVAILABLE" : "PAUSED";
      agentRegistry.updateWorker(worker.id, { status: newStatus });
      loadWorkforceData();
    } catch (err) {
      console.error("Failed to pause/resume worker:", err);
    }
  };

  const handleOpenTelemetry = (worker: WorkerDefinition) => {
    setInspectedTelemetryWorker(worker);
    const logs = workforceRegistry.getWorkerActivity(orgId, worker.id, 20);
    setWorkerActivities(logs);
  };

  const handleDispatchTask = async () => {
    if (!dispatchObjective.trim()) return;
    setIsDispatching(true);
    setDispatchError("");
    setDispatchResult(null);

    try {
      const res = await fetch("/api/workforce/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: dispatchObjective.trim(),
          organizationId: orgId,
          userId,
          targetWorkerId: dispatchWorkerId || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setDispatchError(data.error || "Execution failed");
      } else {
        setDispatchResult(data.data);
        loadWorkforceData();
      }
    } catch (err: any) {
      setDispatchError(err.message || "Failed to dispatch task");
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    setIsCreatingWorker(true);

    try {
      const res = await fetch("/api/workforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newWorkerName.trim(),
          role: newWorkerRole,
          description: newWorkerDesc.trim() || undefined,
          capabilities: newWorkerCaps.split(",").map((c) => c.trim()).filter(Boolean),
          capacity: Number(newWorkerCapacity) || 3,
          organizationId: orgId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateWorkerOpen(false);
        setNewWorkerName("");
        setNewWorkerDesc("");
        setNewWorkerCaps("");
        loadWorkforceData();
      } else {
        alert(data.error || "Failed to create worker");
      }
    } catch (err: any) {
      alert(err.message || "Error creating worker");
    } finally {
      setIsCreatingWorker(false);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.capabilities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRole === "ALL" || w.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const totalAssigned = workers.reduce((acc, w) => acc + (w.workload || 0), 0);
  const totalCapacity = workers.reduce((acc, w) => acc + (w.capacity || 0), 0);
  const activeWorkersCount = workers.filter((w) => w.enabled && w.status !== "DISABLED").length;

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1A2D4C] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,210,255,0.2)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                AI Workforce Operating System
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  PHASE 4
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Governed autonomous specialist workers supervised by <strong className="text-cyan-300">ELMO Central Brain</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#091120] border border-[#1A2D4C] text-xs font-mono text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span>ELMO SUPERVISOR: ACTIVE</span>
          </div>

          <button
            onClick={() => setIsOutcomeModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00FF66] text-black font-bold text-xs font-mono hover:bg-emerald-400 shadow-[0_0_15px_rgba(0,255,102,0.3)] transition-all"
          >
            <Target className="w-3.5 h-3.5 fill-current" />
            <span>Enter Outcome</span>
          </button>

          <button
            onClick={() => setIsCreateWorkerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#091120] border border-[#1A2D4C] text-xs font-mono text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Specialist</span>
          </button>

          <button
            onClick={() => {
              setDispatchObjective("");
              setDispatchResult(null);
              setDispatchError("");
              setIsDispatchOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 text-black font-semibold text-xs font-mono hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Dispatch Task</span>
          </button>
        </div>
      </div>

      {/* Phase 4.1: Active Outcomes Selector (Section 28) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Target className="w-4 h-4 text-[#00FF66]" />
            Active Business Outcomes ({outcomes.length})
          </div>
          <button
            onClick={() => setIsOutcomeModalOpen(true)}
            className="text-xs text-[#00FF66] hover:underline flex items-center gap-1 font-medium"
          >
            + New Desired Outcome
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {outcomes.map((out) => {
            const isSelected = selectedOutcome?.outcomeId === out.outcomeId;
            return (
              <button
                key={out.outcomeId}
                onClick={() => {
                  setSelectedOutcome(out);
                  setActiveTab("outcomes");
                }}
                className={`p-3 rounded-xl border text-left transition-all max-w-sm flex-1 min-w-[240px] ${
                  isSelected
                    ? "bg-zinc-900 border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.2)]"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">🎯 {out.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium uppercase shrink-0 bg-zinc-800 text-zinc-300">
                    {out.status}
                  </span>
                </div>
                {out.targetMetric && (
                  <div className="text-[11px] text-emerald-400 font-mono mt-1">
                    Target: {out.targetMetric.targetValue}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#091120] border border-[#1A2D4C] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Governed AI Workers</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{activeWorkersCount}</span>
            <span className="text-xs text-slate-400">/ {workers.length} Total</span>
          </div>
          <span className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 7 Foundational Specialists Active
          </span>
        </div>

        <div className="p-5 rounded-xl bg-[#091120] border border-[#1A2D4C] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Workload Capacity</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{totalAssigned}</span>
            <span className="text-xs text-slate-400">/ {totalCapacity} Concurrent Slots</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalAssigned / (totalCapacity || 1)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#091120] border border-[#1A2D4C] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Inter-Worker Handoffs</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{handoffs.length}</span>
            <span className="text-xs text-slate-400">Verified Contracts</span>
          </div>
          <span className="text-xs text-cyan-300 mt-1 font-mono">100% Supervised by ELMO</span>
        </div>

        <div className="p-5 rounded-xl bg-[#091120] border border-[#1A2D4C] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Workforce Reliability</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {metrics ? `${(metrics.reliabilityRate * 100).toFixed(0)}%` : "100%"}
            </span>
            <span className="text-xs text-slate-400">Outcome Rate</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 font-mono">
            Avg Duration: {metrics ? `${Math.round(metrics.averageExecutionTimeMs / 1000)}s` : "<1s"}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1A2D4C] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("outcomes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "outcomes"
              ? "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Target className="w-4 h-4 text-[#00FF66]" />
          Desired Outcomes ({outcomes.length})
        </button>

        <button
          onClick={() => setActiveTab("robots")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "robots"
              ? "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Bot className="w-4 h-4 text-[#00FF66]" />
          Robot Workforce ({robots.length})
        </button>

        <button
          onClick={() => setActiveTab("workers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "workers"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Cpu className="w-4 h-4" />
          Specialist Workers ({workers.length})
        </button>

        <button
          onClick={() => setActiveTab("handoffs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "handoffs"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Structured Handoffs ({handoffs.length})
        </button>

        <button
          onClick={() => setActiveTab("governance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "governance"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Safety & Policies
        </button>
      </div>

      {/* Tab 0a: Desired Outcomes */}
      {activeTab === "outcomes" && (
        selectedOutcome ? (
          <OutcomeWorkspace
            outcome={selectedOutcome}
            robots={robots}
            handoffs={handoffs}
            onStartExecution={handleStartOutcome}
            onApproveOutcome={handleApproveOutcome}
            onRejectOutcome={handleRejectOutcome}
            onVerifyOutcome={handleVerifyOutcome}
            onRefresh={loadWorkforceData}
            onOpenOutcomeModal={() => setIsOutcomeModalOpen(true)}
            onCommitOutcome={(prompt) => handleCreateOutcome(prompt)}
          />
        ) : (
          <div className="space-y-6">
            <OutcomeVoiceIntake onCommitOutcome={(prompt) => handleCreateOutcome(prompt)} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outcomes.map((o) => (
                <div key={o.outcomeId} onClick={() => setSelectedOutcome(o)} className="cursor-pointer">
                  <OutcomeCard
                    outcome={o}
                    onStartExecution={(id: string) => handleStartOutcome(id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Tab 0b: Robot Workforce Grid */}
      {activeTab === "robots" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">AI Robot Workforce</h3>
              <p className="text-xs text-zinc-400">
                Consistent digital identity and UX layer for the 10 specialist workers supervised by ELMO
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {robots.map((robot) => (
              <RobotCard
                key={robot.robotId}
                robot={robot}
                onInspect={(r) => setSelectedRobot(r)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 1: Specialist Workers */}
      {activeTab === "workers" && (
        <div className="space-y-6">
          {/* Controls & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search worker name, ID or capability..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#091120] border border-[#1A2D4C] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                "ALL",
                "STRATEGY",
                "RESEARCH",
                "ANALYTICS",
                "MARKETING",
                "COPY",
                "SALES",
                "WEB_CODING",
                "AUTOMATION",
                "SUPPORT",
                "OPERATIONS",
              ].map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap transition-colors ${
                    selectedRole === role
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-[#091120] text-slate-400 border border-[#1A2D4C] hover:text-white"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Workers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkers.map((worker) => {
              const isBusy = worker.workload > 0;
              const isPaused = worker.status === "PAUSED";
              const isEnabled = worker.enabled;

              return (
                <div
                  key={worker.id}
                  className={`p-6 rounded-xl bg-[#091120] border transition-all flex flex-col justify-between space-y-4 ${
                    !isEnabled
                      ? "border-slate-800 opacity-60"
                      : isPaused
                      ? "border-amber-500/30"
                      : "border-[#1A2D4C] hover:border-cyan-500/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-base tracking-tight">{worker.name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1">
                            🤖 {worker.robotName || worker.role}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {worker.role}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500 block mt-0.5">ID: {worker.id}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            !isEnabled
                              ? "bg-slate-500"
                              : isPaused
                              ? "bg-amber-400"
                              : isBusy
                              ? "bg-purple-400 animate-pulse"
                              : "bg-emerald-400"
                          }`}
                        />
                        <span className="text-xs font-mono text-slate-400">
                          {!isEnabled ? "DISABLED" : isPaused ? "PAUSED" : isBusy ? "BUSY" : "AVAILABLE"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">{worker.description}</p>

                    {/* Capabilities */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono text-slate-400">Capabilities:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {worker.capabilities.slice(0, 4).map((cap, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-[#050811] text-slate-300 border border-[#1A2D4C] font-mono text-[11px]"
                          >
                            {cap}
                          </span>
                        ))}
                        {worker.capabilities.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#050811] text-slate-500 border border-[#1A2D4C] font-mono text-[10px]">
                            +{worker.capabilities.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Workload Meter */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>Workload:</span>
                        <span>
                          {worker.workload} / {worker.capacity} Tasks
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (worker.workload / (worker.capacity || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-3 border-t border-[#121E33] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleWorkerStatus(worker)}
                        title={isEnabled ? "Disable Worker" : "Enable Worker"}
                        className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                          isEnabled
                            ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handlePauseWorker(worker)}
                        title={isPaused ? "Resume Worker" : "Pause Worker"}
                        className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                          isPaused
                            ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                        }`}
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleOpenTelemetry(worker)}
                        title="View Operational Telemetry"
                        className="p-1.5 rounded-lg border text-xs font-mono bg-[#050811] text-purple-300 border-[#1A2D4C] hover:border-purple-500/40"
                      >
                        <Activity className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedWorker(worker)}
                      className="px-2.5 py-1 rounded-md text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors flex items-center gap-1"
                    >
                      <span>Prompt & Tools</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Multi-Agent Handoff Stream */}
      {activeTab === "handoffs" && (
        <div className="space-y-4">
          {handoffs.length === 0 ? (
            <div className="p-12 rounded-xl bg-[#091120] border border-[#1A2D4C] text-center">
              <ArrowRightLeft className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Multi-Agent Handoffs Recorded Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                When ELMO coordinates multi-step executions across specialist workers (e.g. Research → Copy → Web), structured handoff contracts will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {handoffs.map((h) => (
                <div
                  key={h.handoffId}
                  className="p-5 rounded-xl bg-[#091120] border border-[#1A2D4C] space-y-3 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#121E33] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 font-mono text-xs border border-cyan-500/30">
                        {h.fromWorkerId}
                      </span>
                      <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                      <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 font-mono text-xs border border-purple-500/30">
                        {h.toWorkerId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
                          h.verificationStatus === "PASSED"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : h.verificationStatus === "PARTIAL"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        Verification: {h.verificationStatus}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </span>

                      <button
                        onClick={() => setInspectedHandoff(h)}
                        className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs border border-cyan-500/30 hover:bg-cyan-500/30 ml-2"
                      >
                        Inspect Contract
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-mono block mb-1">Completed Deliverable:</span>
                      <p className="text-slate-200 bg-[#050811] p-2.5 rounded border border-[#121E33]">
                        {h.completedWork}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono block mb-1">Required Next Action:</span>
                      <p className="text-slate-200 bg-[#050811] p-2.5 rounded border border-[#121E33]">
                        {h.requiredNextAction}
                      </p>
                    </div>
                  </div>

                  {h.evidence && h.evidence.length > 0 && (
                    <div className="text-xs">
                      <span className="text-slate-400 font-mono block mb-1">Verified Evidence:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {h.evidence.map((ev, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-mono text-[11px]"
                          >
                            ✓ {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Safety & Policy Firewall */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-[#091120] border border-[#1A2D4C] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                Workforce Security & Isolation Model
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Specialist AI workers operate in strict bounded environments. They do not possess autonomous agency outside ELMO supervision and can only execute tools explicitly registered in the governed registry.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">Tenant Isolation (Row-Level Security)</span>
                  <span className="text-emerald-400 font-mono font-bold">100% ENFORCED</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">Tool Permission Validation</span>
                  <span className="text-emerald-400 font-mono font-bold">ACTIVE (Pre-execution ACL)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">GitHub External Skills Sandbox</span>
                  <span className="text-emerald-400 font-mono font-bold">MANDATORY (Timeout ≤ 30s)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">Anti-Hardcoding Capability Matching</span>
                  <span className="text-emerald-400 font-mono font-bold">ACTIVE (Capability-driven)</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#091120] border border-[#1A2D4C] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Phase 4 Supervision & Reassignment
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When any worker encounters blockers, verification errors, or unavailable status, ELMO performs structured worker reassignment before falling back to bounded replanning.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">Max Concurrent Tasks Per Worker</span>
                  <span className="text-cyan-400 font-mono font-bold">5 Tasks Default</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">Worker Reassignment Bound</span>
                  <span className="text-cyan-400 font-mono font-bold">Max 1 Attempt / Step</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">Replanning Limit</span>
                  <span className="text-cyan-400 font-mono font-bold">Max 2 Replans / Plan</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33] text-xs">
                  <span className="text-slate-300">Destructive Actions Approval Gate</span>
                  <span className="text-amber-400 font-mono font-bold">WAITING_FOR_APPROVAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Dispatch Workforce Task */}
      {isDispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#091120] border border-[#1A2D4C] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#121E33] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dispatch Workforce Task</h3>
                  <span className="text-xs text-slate-400">Direct execution via ELMO Governed Workforce</span>
                </div>
              </div>
              <button onClick={() => setIsDispatchOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">Business Objective / Directive:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Audit checkout funnel drop-off and draft 3 high-converting headlines for our promotion"
                  value={dispatchObjective}
                  onChange={(e) => setDispatchObjective(e.target.value)}
                  className="w-full p-3 bg-[#050811] border border-[#1A2D4C] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">Target Specialist (Optional):</label>
                <select
                  value={dispatchWorkerId}
                  onChange={(e) => setDispatchWorkerId(e.target.value)}
                  className="w-full p-2.5 bg-[#050811] border border-[#1A2D4C] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                >
                  <option value="">Auto-Assign via ELMO Orchestrator</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role})
                    </option>
                  ))}
                </select>
              </div>

              {dispatchError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                  {dispatchError}
                </div>
              )}

              {dispatchResult && (
                <div className="p-3 rounded-xl bg-[#050811] border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Outcome Verified
                    </span>
                    <span className="text-slate-400">Steps: {dispatchResult.plan?.steps?.length || 1}</span>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-3 font-sans">
                    {dispatchResult.response}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#121E33] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDispatchOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#1A2D4C] text-xs font-mono text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                disabled={isDispatching || !dispatchObjective.trim()}
                onClick={handleDispatchTask}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono hover:bg-cyan-400 disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Orchestrating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Run Directive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Inspect Structured Handoff Contract */}
      {inspectedHandoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#091120] border border-[#1A2D4C] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#121E33] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                  Structured Handoff Contract
                </h3>
                <span className="text-xs font-mono text-slate-400">ID: {inspectedHandoff.handoffId}</span>
              </div>
              <button onClick={() => setInspectedHandoff(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#050811] border border-[#121E33]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold">{inspectedHandoff.fromWorkerId}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-purple-400 font-bold">{inspectedHandoff.toWorkerId}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {inspectedHandoff.verificationStatus}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-mono block mb-1">Objective:</span>
                <p className="p-2.5 rounded bg-[#050811] border border-[#121E33] text-slate-200">
                  {inspectedHandoff.objective}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-mono block mb-1">Completed Deliverable:</span>
                <p className="p-2.5 rounded bg-[#050811] border border-[#121E33] text-slate-200">
                  {inspectedHandoff.completedWork}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-mono block mb-1">Required Next Action:</span>
                <p className="p-2.5 rounded bg-[#050811] border border-[#121E33] text-slate-200">
                  {inspectedHandoff.requiredNextAction}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-mono block mb-1">Outputs Contract Payload:</span>
                <pre className="p-3 rounded bg-[#050811] border border-[#121E33] text-slate-300 font-mono text-[11px] overflow-x-auto max-h-40">
                  {JSON.stringify(inspectedHandoff.outputs, null, 2)}
                </pre>
              </div>

              {inspectedHandoff.evidence && inspectedHandoff.evidence.length > 0 && (
                <div>
                  <span className="text-slate-400 font-mono block mb-1">Verified Evidence ({inspectedHandoff.evidence.length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectedHandoff.evidence.map((ev, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-mono text-[11px]">
                        ✓ {ev}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#121E33] flex justify-end">
              <button
                onClick={() => setInspectedHandoff(null)}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs hover:bg-cyan-500/30"
              >
                Close Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Register Custom Specialist Worker */}
      {isCreateWorkerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateWorker} className="bg-[#091120] border border-[#1A2D4C] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#121E33] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register Specialist Worker</h3>
                  <span className="text-xs text-slate-400">Extend workforce with governed custom worker</span>
                </div>
              </div>
              <button type="button" onClick={() => setIsCreateWorkerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-mono block mb-1">Worker Name:</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. B2B Sales Prospector"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full p-2.5 bg-[#050811] border border-[#1A2D4C] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-mono block mb-1">Primary Role:</label>
                  <select
                    value={newWorkerRole}
                    onChange={(e) => setNewWorkerRole(e.target.value)}
                    className="w-full p-2.5 bg-[#050811] border border-[#1A2D4C] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500/40"
                  >
                    <option value="STRATEGY">STRATEGY</option>
                    <option value="AUTOMATION">AUTOMATION</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="OPERATIONS">OPERATIONS</option>
                    <option value="RESEARCH">RESEARCH</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="COPY">COPY</option>
                    <option value="SALES">SALES</option>
                    <option value="WEB_CODING">WEB_CODING</option>
                    <option value="ANALYTICS">ANALYTICS</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-mono block mb-1">Concurrency Capacity:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newWorkerCapacity}
                    onChange={(e) => setNewWorkerCapacity(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#050811] border border-[#1A2D4C] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-mono block mb-1">Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Scrapes targeted prospects and identifies buying signals"
                  value={newWorkerDesc}
                  onChange={(e) => setNewWorkerDesc(e.target.value)}
                  className="w-full p-2.5 bg-[#050811] border border-[#1A2D4C] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div>
                <label className="text-slate-300 font-mono block mb-1">Capabilities (comma separated):</label>
                <input
                  type="text"
                  placeholder="lead_qualification, market_research, outreach_strategy"
                  value={newWorkerCaps}
                  onChange={(e) => setNewWorkerCaps(e.target.value)}
                  className="w-full p-2.5 bg-[#050811] border border-[#1A2D4C] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#121E33] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateWorkerOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#1A2D4C] text-xs font-mono text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={isCreatingWorker || !newWorkerName.trim()}
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono hover:bg-cyan-400 disabled:opacity-50"
              >
                {isCreatingWorker ? "Registering..." : "Create Worker"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: Worker Telemetry & Activity Audit Drawer */}
      {inspectedTelemetryWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#091120] border border-[#1A2D4C] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#121E33] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Worker Operational Telemetry: {inspectedTelemetryWorker.name}
                </h3>
                <span className="text-xs font-mono text-slate-400">Role: {inspectedTelemetryWorker.role}</span>
              </div>
              <button onClick={() => setInspectedTelemetryWorker(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-[#050811] border border-[#121E33] text-center">
                <span className="text-slate-400 block text-[10px] font-mono">Assigned</span>
                <span className="text-lg font-mono font-bold text-white">
                  {inspectedTelemetryWorker.performanceMetrics?.tasksAssigned || 0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#050811] border border-[#121E33] text-center">
                <span className="text-slate-400 block text-[10px] font-mono">Completed</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {inspectedTelemetryWorker.performanceMetrics?.tasksCompleted || 0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#050811] border border-[#121E33] text-center">
                <span className="text-slate-400 block text-[10px] font-mono">Failed</span>
                <span className="text-lg font-mono font-bold text-red-400">
                  {inspectedTelemetryWorker.performanceMetrics?.tasksFailed || 0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#050811] border border-[#121E33] text-center">
                <span className="text-slate-400 block text-[10px] font-mono">Handoffs</span>
                <span className="text-lg font-mono font-bold text-cyan-400">
                  {inspectedTelemetryWorker.performanceMetrics?.handoffs || 0}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-300 block mb-2">Recent Worker Activity Log:</span>
              {workerActivities.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#050811] border border-[#121E33] text-center text-xs text-slate-500 font-mono">
                  No activity events recorded yet for this worker.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {workerActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded bg-[#050811] border border-[#121E33] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px]">
                          {act.eventType}
                        </span>
                        <span className="text-slate-300 text-[11px]">{act.status}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(act.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#121E33] flex justify-end">
              <button
                onClick={() => setInspectedTelemetryWorker(null)}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs hover:bg-cyan-500/30"
              >
                Close Telemetry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Prompt & Tools Inspector */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#091120] border border-[#1A2D4C] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#121E33] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedWorker.name}
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                    {selectedWorker.role}
                  </span>
                </h3>
                <span className="text-xs font-mono text-slate-400">ID: {selectedWorker.id}</span>
              </div>
              <button onClick={() => setSelectedWorker(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-mono block mb-1">System Instructions / Worker Prompt:</span>
                <pre className="p-3 rounded-lg bg-[#050811] border border-[#121E33] text-slate-300 font-mono text-xs whitespace-pre-wrap">
                  {selectedWorker.systemInstructions}
                </pre>
              </div>

              <div>
                <span className="text-slate-400 font-mono block mb-1">Allowed Tools ({selectedWorker.allowedTools.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWorker.allowedTools.map((t) => (
                    <span key={t} className="px-2 py-1 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-mono block mb-1">Permissions ({selectedWorker.permissions.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWorker.permissions.map((p) => (
                    <span key={p} className="px-2 py-1 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40 font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#121E33] flex justify-end">
              <button
                onClick={() => setSelectedWorker(null)}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs hover:bg-cyan-500/30"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4.1 Modals */}
      <RobotDetailModal
        robot={selectedRobot}
        isOpen={!!selectedRobot}
        onClose={() => setSelectedRobot(null)}
      />

      <OutcomeEntryModal
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        onSubmitOutcome={handleCreateOutcome}
      />
    </div>
  );
}
