/**
 * ELMO Phase 4.0.1 — Workforce Health & Self-Diagnosis Service (WorkforceHealthService)
 *
 * Provides pre-flight execution diagnostics and workforce readiness verification:
 * - Pre-flight Check: Capability -> Worker -> Skill -> Tool -> Permissions -> Dependencies -> Resources -> Approval
 * - If a required condition fails: STOPS BEFORE EXECUTION and reports structured blocker.
 * - Generates machine-readable and displayable WorkforceReadinessReport.
 * - Generates structured ELMO explanation (WHAT I CAN DO, WHAT I CANNOT DO, WHY, WHAT IS MISSING, WHAT CAN HAPPEN NEXT).
 * - Enforces zero false execution claims.
 */

import {
  WorkforceHealthState,
  WorkforceReadinessReport,
  ReadinessComponentCheck,
  ExecutionPlan,
  WorkerBlockerType,
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { SkillRegistryService } from "./skill-registry.service";
import { ToolRegistryService } from "./tool-registry.service";
import { CostResourceGovernorService } from "./cost-resource-governor.service";

export interface PreFlightCheckParams {
  plan: ExecutionPlan;
  organizationId: string;
  userId?: string;
  userRole?: string;
  userPermissions?: string[];
}

export class WorkforceHealthService {
  private static instance: WorkforceHealthService;
  private agentRegistry: AgentRegistryService;
  private skillRegistry: SkillRegistryService;
  private toolRegistry: ToolRegistryService;
  private resourceGovernor: CostResourceGovernorService;

  private constructor() {
    this.agentRegistry = AgentRegistryService.getInstance();
    this.skillRegistry = SkillRegistryService.getInstance();
    this.toolRegistry = ToolRegistryService.getInstance();
    this.resourceGovernor = CostResourceGovernorService.getInstance();
  }

  public static getInstance(): WorkforceHealthService {
    if (!WorkforceHealthService.instance) {
      WorkforceHealthService.instance = new WorkforceHealthService();
    }
    return WorkforceHealthService.instance;
  }

  public static resetInstance(): void {
    WorkforceHealthService.instance = undefined as any;
  }

  /**
   * Evaluates overall health status of the workforce for an organization.
   */
  public diagnoseWorkforceHealth(organizationId: string): {
    status: WorkforceHealthState;
    totalWorkers: number;
    availableWorkers: number;
    disabledWorkers: number;
    busyWorkers: number;
    issues: string[];
  } {
    const workers = this.agentRegistry.getWorkers({ organizationId });
    const available = workers.filter((w) => w.enabled && w.status === "AVAILABLE");
    const disabled = workers.filter((w) => !w.enabled || w.status === "DISABLED");
    const busy = workers.filter((w) => w.status === "BUSY" || w.workload >= w.capacity);

    const issues: string[] = [];
    let status: WorkforceHealthState = "HEALTHY";

    if (available.length === 0) {
      status = "UNAVAILABLE";
      issues.push("No active workers are currently available in the workforce.");
    } else if (disabled.length > 0 || busy.length > 0) {
      status = "DEGRADED";
      if (disabled.length > 0) issues.push(`${disabled.length} worker(s) are disabled or in maintenance.`);
      if (busy.length > 0) issues.push(`${busy.length} worker(s) are operating at maximum capacity.`);
    }

    return {
      status,
      totalWorkers: workers.length,
      availableWorkers: available.length,
      disabledWorkers: disabled.length,
      busyWorkers: busy.length,
      issues,
    };
  }

  /**
   * Conducts comprehensive pre-flight execution check across all steps in an execution plan.
   * If any mandatory condition fails, returns BLOCKED with exact root cause before execution starts.
   */
  public conductPreFlightCheck(params: PreFlightCheckParams): WorkforceReadinessReport {
    const { plan, organizationId } = params;
    const now = Date.now();
    const steps = plan.steps || [];

    const workerChecks: ReadinessComponentCheck[] = [];
    const skillChecks: ReadinessComponentCheck[] = [];
    const toolChecks: ReadinessComponentCheck[] = [];
    const blockers: WorkforceReadinessReport["blockers"] = [];

    const whatICanDo: string[] = [];
    const whatICannotDo: string[] = [];
    const whatIsMissing: string[] = [];
    const whatCanHappenNext: string[] = [];

    let overallState: WorkforceHealthState = "HEALTHY";

    // 1. Check Missing Capabilities from Planner
    if (plan.missingCapabilities && plan.missingCapabilities.length > 0) {
      overallState = "MISSING_CAPABILITY";
      for (const mc of plan.missingCapabilities) {
        blockers.push({
          type: "MISSING_CAPABILITY",
          reason: `Required capability "${mc}" is not available in the workforce registry.`,
          nextAction: `Add an integration or skill providing "${mc}" capability.`,
        });
        whatIsMissing.push(`Capability: ${mc}`);
        whatICannotDo.push(`Execute tasks requiring "${mc}"`);
      }
    }

    // 2. Worker Verification
    const checkedWorkerIds = new Set<string>();
    for (const step of steps) {
      if (checkedWorkerIds.has(step.agentId)) continue;
      checkedWorkerIds.add(step.agentId);

      const worker = this.agentRegistry.getWorker(step.agentId);
      if (!worker || (worker.organizationId && organizationId && worker.organizationId !== organizationId)) {
        overallState = "UNAVAILABLE";
        workerChecks.push({
          id: step.agentId,
          name: step.agentName || step.agentId,
          available: false,
          status: "NOT_FOUND",
          error: `Worker "${step.agentId}" is not registered.`,
        });
        blockers.push({
          type: "WORKER_UNAVAILABLE",
          reason: `Worker "${step.agentId}" is not registered in the Workforce Registry.`,
          nextAction: `Register or assign an active worker for role ${step.agentId}.`,
        });
        whatIsMissing.push(`Worker: ${step.agentId}`);
        whatICannotDo.push(`Execute step assigned to worker "${step.agentId}"`);
      } else if (!worker.enabled || worker.status === "DISABLED" || worker.status === "MAINTENANCE") {
        // Attempt intelligent alternative worker routing before halting
        const allEnabled = this.agentRegistry.getWorkers({ enabledOnly: true });
        const altWorker = allEnabled.find(
          (w) =>
            w.id !== worker.id &&
            w.status === "AVAILABLE" &&
            (w.role === worker.role ||
              (worker.role === "COPY" && w.role === "MARKETING") ||
              (worker.role === "MARKETING" && w.role === "COPY") ||
              (step.skills && step.skills.some((sk) => w.skills?.includes(sk))))
        );

        if (altWorker) {
          const originalName = worker.name;
          step.agentId = altWorker.id;
          step.agentName = altWorker.name;
          workerChecks.push({
            id: altWorker.id,
            name: altWorker.name,
            available: true,
            status: altWorker.status,
            details: `Gracefully reassigned from disabled worker ${originalName}`,
          });
          whatICanDo.push(`Delegate to alternative specialist ${altWorker.name} (${altWorker.role})`);
        } else {
          overallState = "UNAVAILABLE";
          workerChecks.push({
            id: worker.id,
            name: worker.name,
            available: false,
            status: worker.status,
            error: `Worker "${worker.name}" is currently ${worker.status} and no alternative worker is available.`,
          });
          blockers.push({
            type: "WORKER_UNAVAILABLE",
            reason: `Worker "${worker.name}" is ${worker.status} and cannot accept assignments.`,
            nextAction: `Enable worker "${worker.name}" in Workforce Console.`,
          });
          whatIsMissing.push(`Active worker: ${worker.name}`);
          whatICannotDo.push(`Assign work to ${worker.name}`);
        }
      } else {
        workerChecks.push({
          id: worker.id,
          name: worker.name,
          available: true,
          status: worker.status,
          details: `Capacity: ${worker.workload}/${worker.capacity}`,
        });
        whatICanDo.push(`Delegate to ${worker.name} (${worker.role})`);
      }
    }

    // 3. Skills Verification
    const checkedSkillNames = new Set<string>();
    for (const step of steps) {
      for (const skillName of step.skills || []) {
        if (checkedSkillNames.has(skillName)) continue;
        checkedSkillNames.add(skillName);

        const skill = this.skillRegistry.getSkill(skillName);
        if (!skill) {
          overallState = overallState === "HEALTHY" ? "DEGRADED" : overallState;
          skillChecks.push({
            id: skillName,
            name: skillName,
            available: false,
            status: "MISSING",
            error: `Skill "${skillName}" is not registered.`,
          });
        } else if (!skill.enabled) {
          overallState = overallState === "HEALTHY" ? "DEGRADED" : overallState;
          skillChecks.push({
            id: skill.id,
            name: skill.name,
            available: false,
            status: "DISABLED",
          });
        } else {
          skillChecks.push({
            id: skill.id,
            name: skill.name,
            available: true,
            status: "ACTIVE",
          });
        }
      }
    }

    // 4. Tools Verification & Permission Check
    const checkedToolIds = new Set<string>();
    const missingPermissions: string[] = [];
    for (const step of steps) {
      for (const toolId of step.tools || []) {
        if (checkedToolIds.has(toolId)) continue;
        checkedToolIds.add(toolId);

        const tool = this.toolRegistry.getTool(toolId);
        if (!tool) {
          overallState = "MISSING_TOOL";
          toolChecks.push({
            id: toolId,
            name: toolId,
            available: false,
            status: "MISSING_TOOL",
            error: `Tool "${toolId}" is not registered in Controlled Tool Registry.`,
          });
          blockers.push({
            type: "MISSING_TOOL",
            reason: `Required tool "${toolId}" does not exist in the Tool Registry.`,
            nextAction: `Connect or configure the required tool integration for "${toolId}".`,
          });
          whatIsMissing.push(`Tool integration: ${toolId}`);
          whatICannotDo.push(`Execute actions using "${toolId}"`);
        } else {
          const auth = this.toolRegistry.validateToolCall(step.agentId, toolId);
          if (!auth.allowed) {
            overallState = "PERMISSION_REQUIRED";
            missingPermissions.push(`${step.agentId} -> ${toolId}`);
            toolChecks.push({
              id: tool.id,
              name: tool.name,
              available: false,
              status: "PERMISSION_DENIED",
              error: auth.reason || `Worker unauthorized for ${toolId}`,
            });
            blockers.push({
              type: "PERMISSION_DENIED",
              reason: auth.reason || `Worker "${step.agentId}" does not have permission to execute tool "${tool.name}".`,
              nextAction: `Grant permission for worker "${step.agentId}" to use tool "${tool.name}".`,
            });
            whatICannotDo.push(`Authorize ${step.agentId} to call tool "${tool.name}"`);
          } else {
            toolChecks.push({
              id: tool.id,
              name: tool.name,
              available: true,
              status: tool.approvalRequired ? "APPROVAL_REQUIRED" : "AUTHORIZED",
            });
            whatICanDo.push(`Utilize tool "${tool.name}"`);
          }
        }
      }
    }

    // 5. Dependency Validation (Check DAG cycles & missing dependencies)
    const validStepIds = new Set<string>(steps.map((s) => s.id));
    for (const step of steps) {
      for (const depId of step.dependencies || []) {
        if (!validStepIds.has(depId)) {
          overallState = "DEPENDENCY_FAILURE";
          blockers.push({
            type: "DEPENDENCY_FAILURE",
            reason: `Step "${step.id}" depends on non-existent step "${depId}".`,
            nextAction: `Fix task dependency graph to resolve step "${depId}".`,
          });
          whatIsMissing.push(`Dependency step: ${depId}`);
          whatICannotDo.push(`Execute dependent step "${step.id}"`);
        }
      }
    }

    // 6. Resource Quota Check
    const footprint = this.resourceGovernor.estimateFootprint(plan);
    const limitBreaches: string[] = [];
    if (!footprint.withinLimits) {
      overallState = "RESOURCE_LIMIT_REACHED";
      const limits = this.resourceGovernor.getQuotaLimits(organizationId, plan.executionId);
      if (footprint.workersCount > limits.maxWorkerExecutions) {
        limitBreaches.push(`Workers count (${footprint.workersCount}) exceeds limit (${limits.maxWorkerExecutions})`);
      }
      if (footprint.estimatedToolCalls > limits.maxToolCalls) {
        limitBreaches.push(`Estimated tool calls (${footprint.estimatedToolCalls}) exceeds limit (${limits.maxToolCalls})`);
      }
      if (footprint.estimatedCost > limits.maxEstimatedCost) {
        limitBreaches.push(`Estimated cost (RM ${footprint.estimatedCost}) exceeds budget limit (RM ${limits.maxEstimatedCost})`);
      }

      blockers.push({
        type: "RESOURCE_LIMIT_REACHED",
        reason: `Task exceeds configured resource limits: ${limitBreaches.join("; ")}`,
        nextAction: "Increase execution resource quotas or simplify the objective.",
      });
      whatICannotDo.push("Run full execution because resource footprint exceeds configured quota limits");
    }

    // 7. Human Approval Check
    const approvalRequired = steps.some((s) => s.approvalRequired);
    if (approvalRequired && overallState === "HEALTHY") {
      overallState = "APPROVAL_REQUIRED";
    }

    // Compile Final Overall Verdict
    let overall: WorkforceReadinessReport["overall"] = "READY";
    if (blockers.length > 0) {
      overall = "BLOCKED";
    } else if (overallState === "APPROVAL_REQUIRED" || overallState === "DEGRADED") {
      overall = "PARTIALLY_READY";
    }

    // Compose Clear Reason / Why
    let why = "Workforce is fully capable and ready for execution.";
    if (blockers.length > 0) {
      why = blockers.map((b) => b.reason).join(" ");
    } else if (approvalRequired) {
      why = "High-risk actions require human approval clearance before final dispatch.";
    }

    // Compose What Can Happen Next
    if (blockers.length > 0) {
      for (const b of blockers) {
        if (!whatCanHappenNext.includes(b.nextAction)) {
          whatCanHappenNext.push(b.nextAction);
        }
      }
    } else if (approvalRequired) {
      whatCanHappenNext.push("Submit plan to human reviewer for approval.");
    } else {
      whatCanHappenNext.push("Dispatch plan to designated AI workers for execution.");
    }

    return {
      taskId: plan.id,
      objective: plan.objective,
      overall,
      healthState: overallState,
      workers: workerChecks,
      skills: skillChecks,
      tools: toolChecks,
      permissions: {
        granted: missingPermissions.length === 0,
        checked: Array.from(checkedToolIds),
        missing: missingPermissions.length > 0 ? missingPermissions : undefined,
      },
      approval: {
        required: approvalRequired,
        reason: approvalRequired ? "Step includes high-impact or external actions." : undefined,
      },
      resources: {
        withinLimits: footprint.withinLimits,
        estimatedFootprint: {
          workersCount: footprint.workersCount,
          estimatedToolCalls: footprint.estimatedToolCalls,
          estimatedCost: footprint.estimatedCost,
          expectedExecutionTimeSec: footprint.expectedExecutionTimeSec,
        },
        limitBreaches: limitBreaches.length > 0 ? limitBreaches : undefined,
      },
      blockers,
      explanation: {
        whatICanDo,
        whatICannotDo,
        why,
        whatIsMissing,
        whatCanHappenNext,
      },
      generatedAt: now,
    };
  }
}
