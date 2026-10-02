/**
 * ELMO Phase 4 — Governed Workforce Registry Service (WorkforceRegistryService)
 *
 * Provides executive-level workforce orchestration, worker lifecycle management,
 * structured worker-to-worker handoffs, active assignment tracking, operational telemetry,
 * activity logging, and strict multi-tenant isolation under ELMO Central Brain.
 */

import {
  WorkerDefinition,
  WorkerStatus,
  WorkerHandoffContract,
  WorkerActivityEvent,
  WorkerActivityRecord,
  WorkerPerformanceMetrics,
  AgentRole,
  WorkerRole,
  WorkforceArtifact,
  WorkforceLearningSignal,
  WorkforceReadinessReport,
  WorkforceHealthState,
  ResourceFootprintEstimate,
  ExecutionPlan,
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { CostResourceGovernorService } from "./cost-resource-governor.service";
import { WorkforceArtifactService, CreateArtifactParams, ReviseArtifactParams } from "./workforce-artifact.service";
import { WorkforceLearningService, RecordLearningSignalParams } from "./workforce-learning.service";
import { WorkforceHealthService, PreFlightCheckParams } from "./workforce-health.service";
import { RobotIdentityService } from "./robot-identity.service";
import { OutcomeService } from "./outcome.service";
import { DesiredOutcome, CreateOutcomeParams, RobotIdentity } from "./types/agentic.types";

export interface WorkerAssignment {
  assignmentId: string;
  workerId: string;
  taskId: string;
  executionId: string;
  organizationId: string;
  assignedAt: number;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "REASSIGNED";
  completedAt?: number;
}

export class WorkforceRegistryService {
  private static instance: WorkforceRegistryService;
  private agentRegistry: AgentRegistryService;
  private mockStore: MockDataStore;
  private resourceGovernor: CostResourceGovernorService;
  private artifactService: WorkforceArtifactService;
  private learningService: WorkforceLearningService;
  private healthService: WorkforceHealthService;
  private robotService: RobotIdentityService;
  private outcomeService: OutcomeService;

  // In-memory state collections with multi-tenant scoping
  private assignments: Map<string, WorkerAssignment> = new Map();
  private handoffs: Map<string, WorkerHandoffContract[]> = new Map(); // executionId -> handoffs
  private handoffsByOrg: Map<string, WorkerHandoffContract[]> = new Map(); // organizationId -> handoffs
  private activityLogs: WorkerActivityRecord[] = [];

  private constructor() {
    this.agentRegistry = AgentRegistryService.getInstance();
    this.mockStore = MockDataStore.getInstance();
    this.resourceGovernor = CostResourceGovernorService.getInstance();
    this.artifactService = WorkforceArtifactService.getInstance();
    this.learningService = WorkforceLearningService.getInstance();
    this.healthService = WorkforceHealthService.getInstance();
    this.robotService = RobotIdentityService.getInstance();
    this.outcomeService = OutcomeService.getInstance();
    this.robotService.setActivityLogger((p: any) => this.logActivity(p));
    this.outcomeService.setActivityLogger((p: any) => this.logActivity(p));
    this.outcomeService.setWorkforceRegistry(this);
  }

  public static getInstance(): WorkforceRegistryService {
    if (!WorkforceRegistryService.instance) {
      WorkforceRegistryService.instance = new WorkforceRegistryService();
    }
    return WorkforceRegistryService.instance;
  }

  public static resetInstance(): void {
    WorkforceRegistryService.instance = undefined as any;
  }

  public reset(): void {
    this.assignments.clear();
    this.handoffs.clear();
    this.handoffsByOrg.clear();
    this.activityLogs = [];
    this.agentRegistry.reset();
    this.resourceGovernor.reset();
    this.artifactService.reset();
    this.learningService.reset();
    this.robotService.reset();
    this.outcomeService.reset();
    this.robotService.setActivityLogger((p: any) => this.logActivity(p));
    this.outcomeService.setActivityLogger((p: any) => this.logActivity(p));
    this.outcomeService.setWorkforceRegistry(this);
  }

  // ==========================================================================
  // 1. Worker Lifecycle & Governance
  // ==========================================================================

  /**
   * Retrieves workers scoped to an organization and optional filters.
   * Multi-tenancy rule: Builtin/foundational workers are available globally;
   * custom workers are restricted strictly to their owning organizationId.
   */
  public getWorkers(filters?: {
    organizationId?: string;
    role?: AgentRole;
    status?: WorkerStatus;
    enabledOnly?: boolean;
  }): WorkerDefinition[] {
    const all = this.agentRegistry.getWorkers({
      role: filters?.role,
      status: filters?.status,
      enabledOnly: filters?.enabledOnly,
    });

    if (!filters?.organizationId) {
      return all;
    }

    return all.filter((w) => {
      // Global/builtin workers are accessible to any tenant
      if (!w.organizationId || w.source === "builtin") return true;
      // Custom tenant workers must match organizationId
      return w.organizationId === filters.organizationId;
    });
  }

  /**
   * Retrieves a worker by ID with multi-tenant validation.
   */
  public getWorker(workerId: string, organizationId?: string): WorkerDefinition | undefined {
    const worker = this.agentRegistry.getWorker(workerId);
    if (!worker) return undefined;

    if (organizationId && worker.organizationId && worker.organizationId !== organizationId) {
      // Cross-tenant access denied
      return undefined;
    }
    return worker;
  }

  /**
   * Registers a new worker under a specific organization.
   */
  public createWorker(
    worker: Partial<WorkerDefinition> & { id: string; name: string; role: AgentRole; organizationId: string }
  ): WorkerDefinition {
    if (!worker.organizationId) {
      throw new Error("Cannot create a tenant worker without organizationId.");
    }
    return this.agentRegistry.createWorker(worker);
  }

  /**
   * Updates worker definition with tenant boundary check.
   */
  public updateWorker(
    workerId: string,
    updates: Partial<WorkerDefinition>,
    organizationId?: string
  ): boolean {
    const existing = this.getWorker(workerId, organizationId);
    if (!existing) return false;

    if (organizationId && existing.organizationId && existing.organizationId !== organizationId) {
      throw new Error("Unauthorized: Cross-tenant worker modification is prohibited.");
    }

    return this.agentRegistry.updateWorker(workerId, updates);
  }

  /**
   * Enables a worker.
   */
  public enableWorker(workerId: string, organizationId?: string): boolean {
    const existing = this.getWorker(workerId, organizationId);
    if (!existing) return false;
    return this.agentRegistry.enableWorker(workerId);
  }

  /**
   * Disables a worker. A disabled worker must NEVER be selected for execution.
   */
  public disableWorker(workerId: string, organizationId?: string): boolean {
    const existing = this.getWorker(workerId, organizationId);
    if (!existing) return false;
    return this.agentRegistry.disableWorker(workerId);
  }

  /**
   * Retrieves real-time status and operational availability of a worker.
   */
  public getWorkerStatus(workerId: string): {
    status: WorkerStatus;
    availability: number;
    workload: number;
    capacity: number;
    enabled: boolean;
  } | null {
    const worker = this.agentRegistry.getWorker(workerId);
    if (!worker) return null;
    return {
      status: worker.status,
      availability: worker.availability,
      workload: worker.workload,
      capacity: worker.capacity,
      enabled: worker.enabled,
    };
  }

  // ==========================================================================
  // 2. Assignment & Workload Management
  // ==========================================================================

  /**
   * Assigns a task to a worker, tracking workload and updating availability.
   */
  public assignWorker(params: {
    workerId: string;
    taskId: string;
    executionId: string;
    organizationId: string;
    role?: WorkerRole;
  }): { success: boolean; assignmentId?: string; status?: string; workerId?: string; error?: string } {
    const worker = this.getWorker(params.workerId, params.organizationId);

    if (!worker) {
      return { success: false, error: `Worker ${params.workerId} not found.` };
    }

    if (!worker.enabled || worker.status === "DISABLED" || worker.status === "MAINTENANCE") {
      return {
        success: false,
        error: `Worker ${params.workerId} is currently ${worker.status} and cannot accept assignments.`,
      };
    }

    if (worker.workload >= worker.capacity) {
      throw new Error(`Worker ${params.workerId} has reached maximum capacity limit (${worker.capacity}).`);
    }

    const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const assignment: WorkerAssignment = {
      assignmentId,
      workerId: worker.id,
      taskId: params.taskId,
      executionId: params.executionId,
      organizationId: params.organizationId,
      assignedAt: Date.now(),
      status: "ACTIVE",
    };

    this.assignments.set(assignmentId, assignment);
    this.agentRegistry.updateWorkerWorkload(worker.id, 1);
    this.agentRegistry.recordWorkerMetrics(worker.id, { tasksAssigned: 1 });

    this.logActivity({
      organizationId: params.organizationId,
      executionId: params.executionId,
      taskId: params.taskId,
      workerId: worker.id,
      eventType: "TASK_ASSIGNED",
      status: "ASSIGNED",
      metadata: { assignmentId },
    });

    return { success: true, assignmentId, status: "ACTIVE", workerId: worker.id };
  }

  /**
   * Retrieves all active worker assignments, optionally filtered by tenant.
   */
  public getActiveWorkerAssignments(organizationId?: string): WorkerAssignment[] {
    const list: WorkerAssignment[] = [];
    for (const asgn of this.assignments.values()) {
      if (asgn.status === "ACTIVE") {
        if (!organizationId || asgn.organizationId === organizationId) {
          list.push(asgn);
        }
      }
    }
    return list;
  }

  /**
   * Releases an active worker assignment upon task completion or failure.
   */
  public releaseWorker(params: {
    workerId: string;
    assignmentId?: string;
    taskId?: string;
    success: boolean;
    durationMs?: number;
  }): boolean {
    let targetAssignment: WorkerAssignment | undefined;

    if (params.assignmentId) {
      targetAssignment = this.assignments.get(params.assignmentId);
    } else if (params.taskId) {
      for (const asgn of this.assignments.values()) {
        if (asgn.taskId === params.taskId && asgn.workerId === params.workerId && asgn.status === "ACTIVE") {
          targetAssignment = asgn;
          break;
        }
      }
    }

    if (!targetAssignment) {
      return false;
    }

    targetAssignment.status = params.success ? "COMPLETED" : "FAILED";
    targetAssignment.completedAt = Date.now();

    this.agentRegistry.updateWorkerWorkload(params.workerId, -1);
    this.agentRegistry.recordWorkerMetrics(params.workerId, {
      tasksCompleted: params.success ? 1 : 0,
      tasksFailed: params.success ? 0 : 1,
      averageExecutionTimeMs: params.durationMs || 0,
    });

    return true;
  }

  // ==========================================================================
  // 3. Structured Worker Handoff Contract
  // ==========================================================================

  /**
   * Records a governed structured handoff between workers.
   * Section 14: Workers must NOT engage in unrestricted chat.
   * Every handoff is mediated through this formal contract.
   */
  public createWorkerHandoff(
    handoff: Omit<WorkerHandoffContract, "handoffId" | "timestamp" | "inputs" | "evidence" | "taskId"> & {
      taskId?: string;
      inputs?: Record<string, unknown>;
      evidence?: string[];
      organizationId?: string;
    }
  ): WorkerHandoffContract {
    if (!handoff.fromWorkerId || !handoff.toWorkerId || !handoff.executionId || !handoff.objective) {
      throw new Error("Worker handoff requires mandatory fields: fromWorkerId, toWorkerId, executionId, and objective are required.");
    }

    const handoffId = `hoff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record: WorkerHandoffContract = {
      taskId: handoff.taskId || `task-${Date.now()}`,
      inputs: {},
      evidence: [],
      ...handoff,
      handoffId,
      timestamp: Date.now(),
    };

    const list = this.handoffs.get(handoff.executionId) || [];
    list.push(record);
    this.handoffs.set(handoff.executionId, list);

    if (handoff.organizationId) {
      const orgList = this.handoffsByOrg.get(handoff.organizationId) || [];
      orgList.push(record);
      this.handoffsByOrg.set(handoff.organizationId, orgList);
    }

    this.agentRegistry.recordWorkerMetrics(handoff.fromWorkerId, { handoffs: 1 });

    if (handoff.organizationId) {
      this.logActivity({
        organizationId: handoff.organizationId,
        executionId: handoff.executionId,
        taskId: handoff.taskId,
        workerId: handoff.fromWorkerId,
        eventType: "HANDOFF_CREATED",
        status: "HANDOFF_COMPLETED",
        metadata: {
          toWorkerId: handoff.toWorkerId,
          reason: handoff.reason,
          handoffId,
        },
      });

      this.logActivity({
        organizationId: handoff.organizationId,
        executionId: handoff.executionId,
        taskId: handoff.taskId,
        workerId: handoff.toWorkerId,
        eventType: "HANDOFF_RECEIVED",
        status: "HANDOFF_RECEIVED",
        metadata: {
          fromWorkerId: handoff.fromWorkerId,
          handoffId,
        },
      });
    }

    return record;
  }

  /**
   * Retrieves all handoffs recorded for an execution graph or organization.
   */
  public getWorkerHandoffs(idOrOrgId?: string): WorkerHandoffContract[] {
    if (!idOrOrgId) {
      return Array.from(this.handoffs.values()).flat();
    }
    if (this.handoffsByOrg.has(idOrOrgId)) {
      return this.handoffsByOrg.get(idOrOrgId) || [];
    }
    if (this.handoffs.has(idOrOrgId)) {
      return this.handoffs.get(idOrOrgId) || [];
    }
    return [];
  }

  // ==========================================================================
  // 4. Workforce Activity & Telemetry Logging
  // ==========================================================================

  /**
   * Logs a workforce activity event with organization tenant scoping.
   */
  public logActivity(params: {
    organizationId: string;
    executionId?: string;
    taskId?: string;
    workerId: string;
    eventType: WorkerActivityEvent;
    status: string;
    metadata?: Record<string, unknown>;
  }): WorkerActivityRecord {
    const record: WorkerActivityRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: params.organizationId,
      executionId: params.executionId || "system",
      taskId: params.taskId,
      workerId: params.workerId,
      eventType: params.eventType,
      timestamp: Date.now(),
      status: params.status,
      metadata: params.metadata,
    };

    this.activityLogs.unshift(record);
    if (this.activityLogs.length > 500) {
      this.activityLogs.pop();
    }
    return record;
  }

  /**
   * Retrieves activity events scoped to an organization and optional worker.
   */
  public getWorkerActivity(
    organizationId: string,
    workerId?: string,
    limit = 50
  ): WorkerActivityRecord[] {
    let logs = this.activityLogs.filter((l) => l.organizationId === organizationId);
    if (workerId) {
      logs = logs.filter((l) => l.workerId === workerId);
    }
    return logs.slice(0, limit);
  }

  /**
   * Retrieves performance metrics for a specific worker.
   * Section 29: Performance metrics are operational telemetry for reliability,
   * workload, and capacity planning — NOT an "intelligence ranking".
   */
  public getWorkerPerformance(workerId: string): WorkerPerformanceMetrics | null {
    const worker = this.agentRegistry.getWorker(workerId);
    if (!worker) return null;
    return worker.performanceMetrics;
  }

  /**
   * Retrieves aggregate performance metrics across the entire governed workforce.
   */
  public getWorkforcePerformanceMetrics(organizationId?: string): {
    totalTasksAssigned: number;
    totalTasksCompleted: number;
    totalTasksFailed: number;
    totalHandoffs: number;
    averageExecutionTimeMs: number;
    reliabilityRate: number;
  } {
    const workers = this.getWorkers({ organizationId });
    let totalAssigned = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalHandoffs = 0;
    let totalTime = 0;

    for (const w of workers) {
      const m = w.performanceMetrics;
      if (m) {
        totalAssigned += m.tasksAssigned || 0;
        totalCompleted += m.tasksCompleted || 0;
        totalFailed += m.tasksFailed || 0;
        totalHandoffs += m.handoffs || 0;
        totalTime += m.averageExecutionTimeMs || 0;
      }
    }

    const completed = totalCompleted + totalFailed;
    const reliabilityRate = completed > 0 ? (totalCompleted / completed) * 100 : 100;
    const averageExecutionTimeMs = workers.length > 0 ? totalTime / workers.length : 0;

    return {
      totalTasksAssigned: totalAssigned,
      totalTasksCompleted: totalCompleted,
      totalTasksFailed: totalFailed,
      totalHandoffs,
      averageExecutionTimeMs,
      reliabilityRate,
    };
  }

  // ==========================================================================
  // 5. Phase 4.0.1 Intelligence Hardening Integrations
  // ==========================================================================

  // 5a. Workforce Health & Pre-flight Diagnostics
  public diagnoseHealth(organizationId: string): {
    status: WorkforceHealthState;
    totalWorkers: number;
    availableWorkers: number;
    disabledWorkers: number;
    busyWorkers: number;
    issues: string[];
  } {
    return this.healthService.diagnoseWorkforceHealth(organizationId);
  }

  public conductPreFlightCheck(params: PreFlightCheckParams): WorkforceReadinessReport {
    const report = this.healthService.conductPreFlightCheck(params);
    this.logActivity({
      organizationId: params.organizationId,
      executionId: params.plan.executionId,
      taskId: params.plan.id,
      workerId: "elmo-brain",
      eventType: "HEALTH_CHECK_COMPLETED",
      status: report.overall,
      metadata: {
        healthState: report.healthState,
        blockersCount: report.blockers.length,
      },
    });
    return report;
  }

  // 5b. Standardized Workforce Artifacts
  public createArtifact(params: CreateArtifactParams): WorkforceArtifact {
    const artifact = this.artifactService.createArtifact(params);
    this.logActivity({
      organizationId: params.organizationId,
      taskId: params.sourceTask,
      workerId: params.sourceWorker,
      eventType: "ARTIFACT_CREATED",
      status: "CREATED",
      metadata: {
        artifactId: artifact.artifactId,
        artifactType: artifact.artifactType,
        version: artifact.version,
      },
    });
    return artifact;
  }

  public reviseArtifact(params: ReviseArtifactParams): WorkforceArtifact {
    return this.artifactService.reviseArtifact(params);
  }

  public verifyArtifact(
    artifactId: string,
    organizationId: string,
    verification: {
      verified: boolean;
      verifier: string;
      checks: string[];
      technicalPassed?: boolean;
      businessPassed?: boolean;
    }
  ): WorkforceArtifact {
    return this.artifactService.verifyArtifact(artifactId, organizationId, verification);
  }

  public getArtifact(artifactId: string, organizationId: string): WorkforceArtifact | undefined {
    return this.artifactService.getArtifact(artifactId, organizationId);
  }

  public listArtifacts(
    organizationId: string,
    filters?: {
      artifactType?: any;
      sourceWorker?: string;
      status?: any;
    }
  ): WorkforceArtifact[] {
    return this.artifactService.listArtifacts(organizationId, filters);
  }

  // 5c. Governed Learning Signals
  public async emitLearningSignal(params: RecordLearningSignalParams): Promise<WorkforceLearningSignal> {
    const signal = await this.learningService.emitSignal(params);
    this.logActivity({
      organizationId: params.organizationId,
      executionId: params.executionId,
      taskId: params.taskId,
      workerId: params.workerId || "system",
      eventType: "LEARNING_SIGNAL_EMITTED",
      status: signal.signalType,
      metadata: {
        signalId: signal.signalId,
        persistedToMemory: signal.persistedToMemory,
      },
    });
    return signal;
  }

  public getLearningSignals(
    organizationId: string,
    filters?: {
      signalType?: any;
      workerId?: string;
      limit?: number;
    }
  ): WorkforceLearningSignal[] {
    return this.learningService.getSignals(organizationId, filters);
  }

  // 5d. Resource & Cost Controls
  public estimatePlanResourceFootprint(plan: ExecutionPlan): ResourceFootprintEstimate {
    return this.resourceGovernor.estimateFootprint(plan);
  }

  public getCostGovernor(): CostResourceGovernorService {
    return this.resourceGovernor;
  }

  public getArtifactService(): WorkforceArtifactService {
    return this.artifactService;
  }

  public getLearningService(): WorkforceLearningService {
    return this.learningService;
  }

  public getHealthService(): WorkforceHealthService {
    return this.healthService;
  }

  // 6. Phase 4.1: Robot Workforce & Outcome Experience
  public getRobotService(): RobotIdentityService {
    return this.robotService;
  }

  public getOutcomeService(): OutcomeService {
    return this.outcomeService;
  }

  public listRobots(): RobotIdentity[] {
    return this.robotService.getAllRobots();
  }

  public getRobot(identifier: string): RobotIdentity | undefined {
    return this.robotService.resolveRobot(identifier);
  }

  public async createDesiredOutcome(params: CreateOutcomeParams): Promise<DesiredOutcome> {
    return this.outcomeService.createOutcome(params);
  }

  public getDesiredOutcome(outcomeId: string, organizationId: string): DesiredOutcome | undefined {
    return this.outcomeService.getOutcome(outcomeId, organizationId);
  }

  public listDesiredOutcomes(organizationId: string): DesiredOutcome[] {
    return this.outcomeService.listOutcomes(organizationId);
  }
}

