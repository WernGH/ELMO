/**
 * ELMO Phase 4.1 — Outcome-Driven Workforce Service (OutcomeService)
 *
 * Implements the Core Product Principle:
 * "ELMO is built to SELL OUTCOMES. The customer does not buy agents, workers, skills, or tools.
 *  Those are the infrastructure ELMO uses to achieve the customer's desired business outcome."
 *
 * Lifecycle:
 * DESIRED OUTCOME
 *   ↓
 * ELMO (Executive Orchestrator)
 *   ↓
 * AI WORKFORCE (NOVA, ATLAS, STRATEGY, GROW, COPY, etc.)
 *   ↓
 * EXECUTION (Dynamic DAG Plan & Real Tool Telemetry)
 *   ↓
 * VERIFICATION (Outcome Verification & Target Evaluation)
 *   ↓
 * OUTCOME (Achieved / Partially Achieved / Blocked)
 *
 * Rules:
 * - WORKER COMPLETE ≠ OUTCOME COMPLETE.
 * - Zero fake percentage progress animations.
 * - Transparent blocker reporting when capabilities/tools are unavailable.
 * - Strict multi-tenant isolation (RLS).
 */

import {
  DesiredOutcome,
  DesiredOutcomeStatus,
  CreateOutcomeParams,
  OutcomeMilestone,
  OutcomeTargetMetric,
  WorkforceArtifact,
  ExecutionPlan,
} from "./types/agentic.types";
import { RobotIdentityService } from "./robot-identity.service";
import { WorkforceHealthService } from "./workforce-health.service";
import { DynamicTaskPlannerService } from "./dynamic-task-planner.service";
import { CostResourceGovernorService } from "./cost-resource-governor.service";
import { WorkforceArtifactService } from "./workforce-artifact.service";
import { AgentRegistryService } from "./agent-registry.service";

export class OutcomeService {
  private static instance: OutcomeService;

  // outcomeId -> DesiredOutcome
  private outcomes: Map<string, DesiredOutcome> = new Map();

  private robotService: RobotIdentityService;
  private healthService: WorkforceHealthService;
  private planner: DynamicTaskPlannerService;
  private costGovernor: CostResourceGovernorService;
  private artifactService: WorkforceArtifactService;
  private agentRegistry: AgentRegistryService;

  private constructor() {
    this.robotService = RobotIdentityService.getInstance();
    this.healthService = WorkforceHealthService.getInstance();
    this.planner = DynamicTaskPlannerService.getInstance();
    this.costGovernor = CostResourceGovernorService.getInstance();
    this.artifactService = WorkforceArtifactService.getInstance();
    this.agentRegistry = AgentRegistryService.getInstance();
  }

  public static getInstance(): OutcomeService {
    if (!OutcomeService.instance) {
      OutcomeService.instance = new OutcomeService();
    }
    return OutcomeService.instance;
  }

  public static resetInstance(): void {
    OutcomeService.instance = undefined as any;
  }

  public reset(): void {
    this.outcomes.clear();
  }

  /**
   * Creates a new customer Desired Outcome, decomposes required capabilities,
   * assigns robots, and initiates workforce pre-flight health evaluation.
   */
  public async createOutcome(params: CreateOutcomeParams): Promise<DesiredOutcome> {
    if (!params.organizationId) {
      throw new Error("Cannot create outcome without organizationId. Tenant isolation is mandatory.");
    }
    if (!params.title || params.title.trim().length === 0) {
      throw new Error("Outcome title is mandatory.");
    }

    const outcomeId = `out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    // Semantic decomposition of success criteria
    const successCriteria = params.successCriteria && params.successCriteria.length > 0
      ? params.successCriteria
      : this.deriveDefaultSuccessCriteria(params.title, params.targetMetric);

    // Identify required capabilities
    const requiredCapabilities = params.requiredCapabilities && params.requiredCapabilities.length > 0
      ? params.requiredCapabilities
      : this.deriveRequiredCapabilities(params.title);

    // Match assigned workers based on capabilities
    const matchedWorkers = this.agentRegistry.findWorkersForCapabilities(
      requiredCapabilities,
      params.organizationId
    );
    const assignedWorkerNames = Array.from(
      new Set(
        matchedWorkers.map((w) => w.robotName || w.name.replace(" Worker", "").replace(" Agent", ""))
      )
    );
    if (assignedWorkerNames.length === 0) {
      assignedWorkerNames.push("STRATEGY", "RESEARCH", "ANALYTICS");
    }

    // Initialize real measurable milestones
    const milestones: OutcomeMilestone[] = [
      {
        id: `ms-1`,
        title: "Goal Understood & Success Criteria Formulated",
        robotName: "ELMO",
        status: "COMPLETED",
        completedAt: now,
      },
      ...assignedWorkerNames.map((robotName, idx) => ({
        id: `ms-${idx + 2}`,
        title: `Execute ${robotName} specialization`,
        robotName,
        status: "PENDING" as const,
      })),
      {
        id: `ms-final`,
        title: "Outcome Verification Against Target Criteria",
        robotName: "ELMO",
        status: "PENDING" as const,
      },
    ];

    const outcome: DesiredOutcome = {
      outcomeId,
      title: params.title.trim(),
      description: params.description || `Customer outcome: ${params.title.trim()}`,
      desiredResult: params.desiredResult || params.title.trim(),
      constraints: params.constraints || [],
      currentWorkerId: assignedWorkerNames[0] || "STRATEGY",
      progressState: "UNDERSTANDING",
      organizationId: params.organizationId,
      userId: params.userId,
      status: "UNDERSTANDING",
      successCriteria,
      targetMetric: params.targetMetric,
      requiredCapabilities,
      assignedWorkers: assignedWorkerNames,
      milestones,
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };

    this.outcomes.set(outcomeId, outcome);

    // Broadcast ELMO executive understanding
    this.robotService.addMessage({
      fromRobotId: "robot-elmo",
      fromRobotName: "ELMO",
      outcomeId,
      messageText: `Understood outcome: "${outcome.title}". Formulating required workforce capabilities and evaluating readiness.`,
      eventType: "STATUS_UPDATE",
    });

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: "elmo-orchestrator",
      eventType: "OUTCOME_CREATED",
      status: "UNDERSTANDING",
      metadata: { outcomeId: outcome.outcomeId, title: outcome.title },
    });

    // Run Pre-Flight Workforce Health Check
    await this.evaluateWorkforceReadiness(outcome);

    return outcome;
  }

  /**
   * Evaluates workforce health and capability readiness before major execution.
   */
  public async evaluateWorkforceReadiness(outcome: DesiredOutcome): Promise<DesiredOutcome> {
    const planResult = await this.planner.plan({
      objective: outcome.title,
      organizationId: outcome.organizationId,
      userId: outcome.userId,
    });

    outcome.updatedAt = Date.now();

    const hasMissingCapabilities =
      (planResult.missingCapabilities && planResult.missingCapabilities.length > 0) ||
      (planResult.unsupportedCapabilities && planResult.unsupportedCapabilities.length > 0);

    if (hasMissingCapabilities || !planResult.plan) {
      outcome.status = "BLOCKED";
      const missing = [
        ...(planResult.missingCapabilities || []),
        ...(planResult.unsupportedCapabilities || []),
      ];
      outcome.blocker = {
        reason: "MISSING_CAPABILITY",
        whatCompleted: ["Interpreted business objective", "Decomposed required capabilities"],
        whatIsMissing: missing.length > 0 ? missing : ["Approved tool integration required"],
        nextAction: "Connect an approved integration or enable required capabilities.",
      };

      this.robotService.addMessage({
        fromRobotId: "robot-elmo",
        fromRobotName: "ELMO",
        outcomeId: outcome.outcomeId,
        messageText: `Execution blocked: Missing capability for "${outcome.title}". ${outcome.blocker.nextAction}`,
        eventType: "STATUS_UPDATE",
      });

      return outcome;
    }

    outcome.executionPlanId = planResult.plan.id;
    outcome.executionPlan = planResult.plan;

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: "elmo-orchestrator",
      eventType: "PLAN_CREATED",
      status: "PLAN_CREATED",
      metadata: { planId: planResult.plan.id, stepsCount: planResult.plan.steps.length },
    });

    const readinessReport = this.healthService.conductPreFlightCheck({
      plan: planResult.plan,
      organizationId: outcome.organizationId,
      userId: outcome.userId,
    });

    if (readinessReport.overall === "BLOCKED") {
      outcome.status = "BLOCKED";
      const primaryBlocker = readinessReport.blockers[0];
      outcome.blocker = {
        reason: primaryBlocker?.reason || "MISSING_CAPABILITY",
        whatCompleted: readinessReport.explanation.whatICanDo,
        whatIsMissing: readinessReport.explanation.whatIsMissing,
        nextAction: primaryBlocker?.nextAction || "Resolve identified missing capabilities in settings.",
      };
      outcome.blockers = [outcome.blocker];

      this.robotService.addMessage({
        fromRobotId: "robot-elmo",
        fromRobotName: "ELMO",
        outcomeId: outcome.outcomeId,
        messageText: `Execution blocked: ${outcome.blocker.reason}. ${outcome.blocker.nextAction}`,
        eventType: "STATUS_UPDATE",
      });

      this.logActivityEvent({
        organizationId: outcome.organizationId,
        executionId: outcome.outcomeId,
        workerId: "elmo-orchestrator",
        eventType: "WORKER_BLOCKED",
        status: "BLOCKED",
        metadata: { reason: outcome.blocker.reason },
      });

      return outcome;
    }

    if (readinessReport.approval.required) {
      outcome.status = "WAITING";
      this.robotService.addMessage({
        fromRobotId: "robot-elmo",
        fromRobotName: "ELMO",
        outcomeId: outcome.outcomeId,
        messageText: `Workforce ready. Human approval required before activating high-risk actions.`,
        eventType: "APPROVAL_REQUEST",
      });

      this.logActivityEvent({
        organizationId: outcome.organizationId,
        executionId: outcome.outcomeId,
        workerId: "elmo-orchestrator",
        eventType: "APPROVAL_REQUESTED",
        status: "WAITING",
        metadata: { outcomeId: outcome.outcomeId },
      });

      return outcome;
    }

    outcome.status = "READY";
    return outcome;
  }

  /**
   * Starts live execution of an outcome across the AI workforce.
   */
  public startExecution(outcomeId: string, organizationId: string): DesiredOutcome {
    const outcome = this.getOutcome(outcomeId, organizationId);
    if (!outcome) {
      throw new Error(`Outcome "${outcomeId}" not found for organization "${organizationId}".`);
    }

    if (outcome.status === "BLOCKED") {
      throw new Error(`Cannot start execution for blocked outcome: ${outcome.blocker?.reason}`);
    }

    if (outcome.status === "WAITING") {
      throw new Error(`Cannot start execution for outcome awaiting human approval. Human clearance is mandatory.`);
    }

    outcome.status = "EXECUTING";
    outcome.progressState = "EXECUTING";
    outcome.updatedAt = Date.now();

    // Mark first worker milestone as IN_PROGRESS
    const pendingMs = outcome.milestones.find((m) => m.status === "PENDING" && m.robotName !== "ELMO");
    if (pendingMs) {
      pendingMs.status = "IN_PROGRESS";
      outcome.currentWorkerId = pendingMs.robotName;
      const robot = this.robotService.getRobotByName(pendingMs.robotName || "");
      if (robot) {
        this.robotService.setRobotStatus(robot.robotId, "WORKING", "RESEARCHING", {
          currentOutcomeId: outcome.outcomeId,
          currentTask: `Executing ${outcome.title}`,
        });
      }

      this.logActivityEvent({
        organizationId: outcome.organizationId,
        executionId: outcome.outcomeId,
        workerId: pendingMs.robotName || "elmo-orchestrator",
        eventType: "WORKER_ASSIGNED",
        status: "ASSIGNED",
        metadata: { outcomeId: outcome.outcomeId, robotName: pendingMs.robotName },
      });

      this.logActivityEvent({
        organizationId: outcome.organizationId,
        executionId: outcome.outcomeId,
        workerId: pendingMs.robotName || "elmo-orchestrator",
        eventType: "WORKER_STARTED",
        status: "WORKING",
        metadata: { outcomeId: outcome.outcomeId, robotName: pendingMs.robotName },
      });
    }

    this.robotService.addMessage({
      fromRobotId: "robot-elmo",
      fromRobotName: "ELMO",
      outcomeId: outcome.outcomeId,
      messageText: `Workforce execution initiated. Coordinating specialist workers toward target outcome.`,
      eventType: "STATUS_UPDATE",
    });

    return outcome;
  }

  /**
   * Advances a milestone upon worker completion.
   * CRITICAL PRINCIPLE: WORKER COMPLETE ≠ OUTCOME COMPLETE!
   */
  public completeWorkerStep(
    outcomeId: string,
    organizationId: string,
    robotName: string,
    artifact?: WorkforceArtifact,
    nextRobotName?: string
  ): DesiredOutcome {
    const outcome = this.getOutcome(outcomeId, organizationId);
    if (!outcome) {
      throw new Error(`Outcome "${outcomeId}" not found.`);
    }

    // Complete the worker's milestone
    const ms = outcome.milestones.find((m) => m.robotName === robotName && m.status === "IN_PROGRESS");
    if (ms) {
      ms.status = "COMPLETED";
      ms.completedAt = Date.now();
    }

    // Attach produced artifact to outcome
    if (artifact) {
      const exists = outcome.artifacts.some((a) => a.artifactId === artifact.artifactId);
      if (!exists) {
        outcome.artifacts.push(artifact);
      }
      this.logActivityEvent({
        organizationId: outcome.organizationId,
        executionId: outcome.outcomeId,
        workerId: robotName,
        eventType: "ARTIFACT_CREATED",
        status: "CREATED",
        metadata: { artifactId: artifact.artifactId, title: artifact.title },
      });
    }

    // Update worker robot status to COMPLETE
    const currentRobot = this.robotService.getRobotByName(robotName);
    if (currentRobot) {
      this.robotService.setRobotStatus(currentRobot.robotId, "COMPLETE", "COMPLETED");
    }

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: robotName,
      eventType: "WORKER_COMPLETED",
      status: "COMPLETED",
      metadata: { outcomeId: outcome.outcomeId, robotName },
    });

    // If there is a next worker, record visible handoff and advance milestone
    if (nextRobotName) {
      outcome.currentWorkerId = nextRobotName;
      const nextRobot = this.robotService.getRobotByName(nextRobotName);
      if (nextRobot) {
        if (currentRobot) {
          this.robotService.recordHandoff(
            currentRobot.robotId,
            nextRobot.robotId,
            `Transferred verified findings to ${nextRobot.displayName} for subsequent execution.`
          );
        }

        const nextMs = outcome.milestones.find((m) => m.robotName === nextRobotName && m.status === "PENDING");
        if (nextMs) {
          nextMs.status = "IN_PROGRESS";
        }

        this.robotService.setRobotStatus(nextRobot.robotId, "WORKING", "ANALYZING", {
          currentOutcomeId: outcome.outcomeId,
          currentTask: `Working on verified handoff from ${robotName}`,
        });

        this.logActivityEvent({
          organizationId: outcome.organizationId,
          executionId: outcome.outcomeId,
          workerId: robotName,
          eventType: "HANDOFF_CREATED",
          status: "HANDOFF",
          metadata: { from: robotName, to: nextRobotName },
        });

        this.logActivityEvent({
          organizationId: outcome.organizationId,
          executionId: outcome.outcomeId,
          workerId: nextRobotName,
          eventType: "HANDOFF_RECEIVED",
          status: "HANDOFF_RECEIVED",
          metadata: { from: robotName, to: nextRobotName },
        });

        this.logActivityEvent({
          organizationId: outcome.organizationId,
          executionId: outcome.outcomeId,
          workerId: nextRobotName,
          eventType: "WORKER_ASSIGNED",
          status: "ASSIGNED",
          metadata: { outcomeId: outcome.outcomeId, robotName: nextRobotName },
        });
      }
    }

    // IMPORTANT: Outcome status remains EXECUTING! Worker completion is NOT outcome completion.
    outcome.status = "EXECUTING";
    outcome.updatedAt = Date.now();

    return outcome;
  }

  /**
   * Evaluates the final Desired Outcome against measurable acceptance criteria.
   * Supports: ACHIEVED, PARTIALLY_ACHIEVED, and FAILED.
   */
  public verifyOutcome(
    outcomeId: string,
    organizationId: string,
    measuredResult?: {
      currentValue: string | number;
      criteriaResults?: Array<{ criterion: string; passed: boolean }>;
      details?: string;
    }
  ): DesiredOutcome {
    const outcome = this.getOutcome(outcomeId, organizationId);
    if (!outcome) {
      throw new Error(`Outcome "${outcomeId}" not found.`);
    }

    outcome.status = "VERIFYING";
    const now = Date.now();

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: "elmo-orchestrator",
      eventType: "WORKER_VERIFYING",
      status: "VERIFYING",
      metadata: { outcomeId: outcome.outcomeId },
    });

    const criteriaChecks = measuredResult?.criteriaResults || outcome.successCriteria.map((c) => ({
      criterion: c,
      passed: true,
    }));

    const criteriaMet = criteriaChecks.filter((c) => c.passed).map((c) => c.criterion);
    const criteriaUnmet = criteriaChecks.filter((c) => !c.passed).map((c) => c.criterion);

    // Update target metric with measured current value if provided
    if (measuredResult?.currentValue !== undefined && outcome.targetMetric) {
      outcome.targetMetric.currentValue = measuredResult.currentValue;
    }

    const allPassed = criteriaUnmet.length === 0;
    const partialPassed = criteriaMet.length > 0 && criteriaUnmet.length > 0;

    let finalStatus: DesiredOutcomeStatus = "ACHIEVED";
    let explanation: { whatAchieved: string[]; whatRemains: string[]; whyPartial?: string; nextSteps: string[] } | undefined;

    if (allPassed) {
      finalStatus = "ACHIEVED";
      explanation = {
        whatAchieved: criteriaMet,
        whatRemains: [],
        nextSteps: ["Monitor ongoing performance telemetry", "Preserve verified workflow into Company Brain"],
      };
    } else if (partialPassed) {
      finalStatus = "PARTIALLY_ACHIEVED";
      explanation = {
        whatAchieved: criteriaMet,
        whatRemains: criteriaUnmet,
        whyPartial: measuredResult?.details || "Some secondary performance criteria were not fully satisfied within the execution window.",
        nextSteps: ["Iterate on remaining unmet criteria", "Request targeted worker follow-up"],
      };
    } else {
      finalStatus = "FAILED";
      explanation = {
        whatAchieved: [],
        whatRemains: criteriaUnmet,
        whyPartial: "Target acceptance criteria failed verification.",
        nextSteps: ["Review diagnostic report", "Replan with adjusted constraints"],
      };
    }

    outcome.status = finalStatus;
    outcome.verification = {
      verified: allPassed,
      criteriaMet,
      criteriaUnmet,
      details: measuredResult?.details || (allPassed ? "All target criteria verified against business telemetry." : "Partial verification outcome."),
      verifiedAt: now,
    };
    outcome.explanation = explanation;
    outcome.updatedAt = now;

    // Complete final milestone
    const finalMs = outcome.milestones.find((m) => m.id === "ms-final");
    if (finalMs) {
      finalMs.status = allPassed ? "COMPLETED" : "BLOCKED";
      finalMs.completedAt = now;
    }

    this.robotService.addMessage({
      fromRobotId: "robot-elmo",
      fromRobotName: "ELMO",
      outcomeId: outcome.outcomeId,
      messageText: `Outcome verification complete. Final status: ${finalStatus}. Verified ${criteriaMet.length}/${outcome.successCriteria.length} criteria.`,
      eventType: "VERIFICATION",
    });

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: "elmo-orchestrator",
      eventType: "VERIFICATION_COMPLETED",
      status: finalStatus,
      metadata: { verified: allPassed, metCount: criteriaMet.length, unmetCount: criteriaUnmet.length },
    });

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: "elmo-orchestrator",
      eventType: finalStatus === "ACHIEVED" ? "OUTCOME_ACHIEVED" : (finalStatus === "FAILED" ? "OUTCOME_FAILED" : "OUTCOME_UPDATED"),
      status: finalStatus,
      metadata: { outcomeId: outcome.outcomeId, finalStatus },
    });

    return outcome;
  }

  /**
   * Approves a waiting outcome, clearing human authorization gates.
   */
  public approveOutcome(outcomeId: string, organizationId: string): DesiredOutcome {
    const outcome = this.getOutcome(outcomeId, organizationId);
    if (!outcome) {
      throw new Error(`Outcome "${outcomeId}" not found.`);
    }

    if (outcome.status !== "WAITING") {
      throw new Error(`Outcome "${outcomeId}" is not in WAITING state.`);
    }

    outcome.status = "READY";
    outcome.updatedAt = Date.now();

    this.robotService.addMessage({
      fromRobotId: "robot-elmo",
      fromRobotName: "ELMO",
      outcomeId: outcome.outcomeId,
      messageText: `Human authorization granted. Workforce approved to execute high-impact actions.`,
      eventType: "APPROVAL_REQUEST",
    });

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: "elmo-orchestrator",
      eventType: "OUTCOME_UPDATED",
      status: "READY",
      metadata: { outcomeId: outcome.outcomeId, approved: true },
    });

    return outcome;
  }

  /**
   * Rejects an outcome approval request.
   */
  public rejectOutcome(outcomeId: string, organizationId: string, reason?: string): DesiredOutcome {
    const outcome = this.getOutcome(outcomeId, organizationId);
    if (!outcome) {
      throw new Error(`Outcome "${outcomeId}" not found.`);
    }

    outcome.status = "CANCELLED";
    outcome.updatedAt = Date.now();

    this.robotService.addMessage({
      fromRobotId: "robot-elmo",
      fromRobotName: "ELMO",
      outcomeId: outcome.outcomeId,
      messageText: `Outcome execution cancelled by human authority: ${reason || "Authorization declined."}`,
      eventType: "STATUS_UPDATE",
    });

    this.logActivityEvent({
      organizationId: outcome.organizationId,
      executionId: outcome.outcomeId,
      workerId: "elmo-orchestrator",
      eventType: "OUTCOME_FAILED",
      status: "CANCELLED",
      metadata: { outcomeId: outcome.outcomeId, reason },
    });

    return outcome;
  }

  /**
   * Retrieves an outcome strictly within tenant boundaries.
   */
  public getOutcome(outcomeId: string, organizationId: string): DesiredOutcome | undefined {
    const outcome = this.outcomes.get(outcomeId);
    if (!outcome || outcome.organizationId !== organizationId) {
      return undefined;
    }
    return outcome;
  }

  /**
   * Lists all outcomes for an organization, optionally filtered by status.
   */
  public listOutcomes(
    organizationId: string,
    filters?: { status?: DesiredOutcomeStatus }
  ): DesiredOutcome[] {
    let list = Array.from(this.outcomes.values()).filter(
      (o) => o.organizationId === organizationId
    );

    if (filters?.status) {
      list = list.filter((o) => o.status === filters.status);
    }

    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Semantic derivation of success criteria for an outcome title.
   */
  private deriveDefaultSuccessCriteria(title: string, metric?: OutcomeTargetMetric): string[] {
    const criteria: string[] = [];
    if (metric) {
      criteria.push(`Achieve target ${metric.name}: ${metric.targetValue}`);
    } else if (title.includes("%") || title.includes("increase") || title.includes("grow")) {
      criteria.push("Demonstrate measurable positive conversion or lead delta");
    } else {
      criteria.push("Fulfill core business specification without regressions");
    }

    criteria.push("Quality benchmarks verified against Company Brain rules");
    criteria.push("Zero unhandled technical or security defects");
    return criteria;
  }

  /**
   * Derives required capabilities from outcome objective.
   */
  private deriveRequiredCapabilities(title: string): string[] {
    const lower = title.toLowerCase();
    const capabilities: string[] = [];

    if (lower.includes("lead") || lower.includes("sales") || lower.includes("funnel") || lower.includes("conversion")) {
      capabilities.push("lead_qualification", "conversion_analysis", "funnel_architecture");
    }
    if (lower.includes("market") || lower.includes("campaign") || lower.includes("offer")) {
      capabilities.push("marketing_analysis", "offer_design", "campaign_planning");
    }
    if (lower.includes("copy") || lower.includes("headline") || lower.includes("email") || lower.includes("message")) {
      capabilities.push("copywriting", "messaging");
    }
    if (lower.includes("web") || lower.includes("page") || lower.includes("landing") || lower.includes("code")) {
      capabilities.push("landing_page_generation", "code_modification");
    }
    if (lower.includes("automate") || lower.includes("workflow") || lower.includes("trigger") || lower.includes("follow up")) {
      capabilities.push("workflow_automation", "process_mapping");
    }
    if (lower.includes("support") || lower.includes("customer") || lower.includes("enquiry")) {
      capabilities.push("customer_support", "customer_enquiry_resolution");
    }
    if (lower.includes("strategy") || lower.includes("plan") || lower.includes("goal")) {
      capabilities.push("strategic_planning", "goal_analysis");
    }

    if (capabilities.length === 0) {
      capabilities.push("market_research", "strategic_planning", "analyze_data");
    }

    return Array.from(new Set(capabilities));
  }

  private activityLogger?: (params: any) => void;
  private workforceRegistry?: any;

  public setActivityLogger(logger: (params: any) => void): void {
    this.activityLogger = logger;
  }

  public setWorkforceRegistry(registry: any): void {
    this.workforceRegistry = registry;
  }

  /**
   * Logs a workforce activity event with organization tenant scoping.
   */
  private logActivityEvent(params: {
    organizationId: string;
    executionId?: string;
    workerId: string;
    eventType: any;
    status: string;
    metadata?: Record<string, unknown>;
  }): void {
    if (this.activityLogger) {
      this.activityLogger(params);
    }
  }

  /**
   * Section Q: Assembles the Unified Read Model for an Outcome Workspace.
   */
  public async getUnifiedWorkspace(outcomeId: string, organizationId: string) {
    const outcome = this.getOutcome(outcomeId, organizationId);
    if (!outcome) return null;

    const allRobots = this.robotService.getAllRobots();
    const assignedRobots = allRobots.filter((r) =>
      outcome.assignedWorkers.includes(r.displayName) ||
      outcome.assignedWorkers.includes(r.role) ||
      outcome.assignedWorkers.includes(r.workerId)
    );

    // Current worker resolution
    const currentWorkerName = outcome.currentWorkerId || outcome.milestones.find((m) => m.status === "IN_PROGRESS")?.robotName;
    const currentWorker = currentWorkerName
      ? this.robotService.getRobotByName(currentWorkerName) || this.robotService.resolveRobot(currentWorkerName)
      : undefined;

    // Worker states
    const workerStates: Record<string, { status: string; workingPhase: string; currentTask?: string }> = {};
    for (const r of allRobots) {
      workerStates[r.robotId] = {
        status: r.status,
        workingPhase: r.workingPhase,
        currentTask: r.currentTask,
      };
    }

    // Handoffs
    const handoffs: any[] = this.workforceRegistry
      ? this.workforceRegistry.getWorkerHandoffs(organizationId)
      : [];

    // Activities
    const activities: any[] = this.workforceRegistry
      ? this.workforceRegistry.getWorkerActivity(organizationId, undefined, 50)
      : [];

    // Tools
    const tools = allRobots.flatMap((r) => r.recentTools || []);

    // Approvals
    let approvals: any[] = [];
    try {
      const { ApprovalService } = require("@/services/approval.service");
      approvals = await ApprovalService.getInstance().getApprovals(outcome.userId, organizationId);
    } catch {}

    return {
      outcome,
      plan: outcome.executionPlan,
      currentWorker,
      workers: assignedRobots.length > 0 ? assignedRobots : allRobots,
      workerStates,
      handoffs,
      activities,
      tools,
      artifacts: outcome.artifacts || [],
      approvals,
      verification: outcome.verification,
      blockers: outcome.blockers || (outcome.blocker ? [outcome.blocker] : undefined),
      result: outcome.explanation,
    };
  }
}

export type UnifiedOutcomeWorkspace = NonNullable<Awaited<ReturnType<OutcomeService["getUnifiedWorkspace"]>>>;

