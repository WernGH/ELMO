/**
 * ELMO Phase 4.0.1 — Cost & Resource Governor Service (CostResourceGovernorService)
 *
 * Governs and meters execution resource consumption across ELMO workforce:
 * - Model / API usage and estimated cost tracking (using estimatedCost when provider pricing unavailable)
 * - Tool calls, worker executions, duration, retries, and parallel concurrency tracking
 * - Configurable quota limits at task, worker, organization, and execution scopes
 * - Stops execution immediately when limits are breached: RESOURCE_LIMIT_REACHED
 * - Provides execution footprint transparency for high resource plans
 * - STRICT CONSTRAINT: Cost awareness informs planning but NEVER overrides human approval or verification
 */

import {
  ResourceUsageMetrics,
  ResourceQuotaLimits,
  ResourceFootprintEstimate,
  ExecutionPlan,
  WorkerBlockerType,
} from "./types/agentic.types";

export const DEFAULT_RESOURCE_QUOTA_LIMITS: ResourceQuotaLimits = {
  maxWorkerExecutions: 10,
  maxToolCalls: 25,
  maxRetries: 3,
  maxParallelWorkers: 4,
  maxExecutionTimeMs: 60000, // 60 seconds default per execution
  maxEstimatedCost: 15.0, // In currency units (e.g. RM 15.00 / $15.00)
};

export class CostResourceGovernorService {
  private static instance: CostResourceGovernorService;

  // Active execution resource metrics: executionId -> ResourceUsageMetrics
  private metrics: Map<string, ResourceUsageMetrics> = new Map();

  // Custom limits per organization: organizationId -> ResourceQuotaLimits
  private orgLimits: Map<string, ResourceQuotaLimits> = new Map();

  // Custom limits per execution: executionId -> ResourceQuotaLimits
  private executionLimits: Map<string, ResourceQuotaLimits> = new Map();

  private constructor() {}

  public static getInstance(): CostResourceGovernorService {
    if (!CostResourceGovernorService.instance) {
      CostResourceGovernorService.instance = new CostResourceGovernorService();
    }
    return CostResourceGovernorService.instance;
  }

  public static resetInstance(): void {
    CostResourceGovernorService.instance = undefined as any;
  }

  public reset(): void {
    this.metrics.clear();
    this.orgLimits.clear();
    this.executionLimits.clear();
  }

  /**
   * Initializes or gets the usage record for an execution.
   */
  public getOrCreateMetrics(executionId: string): ResourceUsageMetrics {
    if (!this.metrics.has(executionId)) {
      this.metrics.set(executionId, {
        modelCalls: 0,
        tokensUsed: 0,
        estimatedCost: 0,
        currency: "MYR",
        toolCalls: 0,
        workerExecutions: 0,
        executionDurationMs: 0,
        retryCount: 0,
        reassignmentCount: 0,
        parallelWorkerCount: 1,
        taskComplexity: "LOW",
        estimatedResourceConsumption: "LOW",
      });
    }
    return this.metrics.get(executionId)!;
  }

  /**
   * Configures organization-scoped resource quotas.
   */
  public setOrganizationLimits(organizationId: string, limits: Partial<ResourceQuotaLimits>): void {
    const existing = this.getQuotaLimits(organizationId);
    this.orgLimits.set(organizationId, { ...existing, ...limits });
  }

  /**
   * Configures execution-specific resource quotas.
   */
  public setExecutionLimits(executionId: string, limits: Partial<ResourceQuotaLimits>): void {
    const existing = DEFAULT_RESOURCE_QUOTA_LIMITS;
    this.executionLimits.set(executionId, { ...existing, ...limits });
  }

  /**
   * Retrieves effective quota limits for an organization or fallback default.
   */
  public getQuotaLimits(organizationId?: string, executionId?: string): ResourceQuotaLimits {
    if (executionId && this.executionLimits.has(executionId)) {
      return this.executionLimits.get(executionId)!;
    }
    if (organizationId && this.orgLimits.has(organizationId)) {
      return this.orgLimits.get(organizationId)!;
    }
    return { ...DEFAULT_RESOURCE_QUOTA_LIMITS };
  }

  /**
   * Pre-execution footprint estimation to inform users and planning before execution.
   */
  public estimateFootprint(plan: ExecutionPlan): ResourceFootprintEstimate {
    const steps = plan.steps || [];
    const workersCount = new Set(steps.map((s) => s.agentId)).size;
    const estimatedToolCalls = steps.reduce((sum, s) => sum + (s.tools?.length || 1), 0);

    // Approximate cost: 0.20 per worker step + 0.10 per tool call (RM/currency units)
    const baseCostPerStep = 0.25;
    const baseCostPerTool = 0.10;
    const estimatedCost = Number((steps.length * baseCostPerStep + estimatedToolCalls * baseCostPerTool).toFixed(2));
    const expectedExecutionTimeSec = Math.max(3, steps.length * 4);

    let complexity: ResourceFootprintEstimate["complexity"] = "LOW";
    if (workersCount >= 4 || estimatedToolCalls >= 12) {
      complexity = "VERY_HIGH";
    } else if (workersCount >= 3 || estimatedToolCalls >= 6) {
      complexity = "HIGH";
    } else if (workersCount >= 2 || estimatedToolCalls >= 3) {
      complexity = "MEDIUM";
    }

    const limits = this.getQuotaLimits(plan.organizationId, plan.executionId);
    const withinLimits =
      workersCount <= limits.maxWorkerExecutions &&
      estimatedToolCalls <= limits.maxToolCalls &&
      estimatedCost <= limits.maxEstimatedCost;

    const explanation = `This task requires ${workersCount} worker(s) and ~${estimatedToolCalls} tool calls. Workers: ${workersCount}. Tool calls: ${estimatedToolCalls}. Estimated cost: ~RM ${estimatedCost}. Expected execution time: ~${expectedExecutionTimeSec}s.`;

    return {
      workersCount,
      estimatedToolCalls,
      estimatedCost,
      expectedExecutionTimeSec,
      explanation,
      complexity,
      withinLimits,
    };
  }

  /**
   * Registers a tool call and verifies resource limits.
   * If limit breached, returns allowed: false with RESOURCE_LIMIT_REACHED blocker.
   */
  public trackToolCall(
    executionId: string,
    toolId: string,
    organizationId?: string
  ): {
    allowed: boolean;
    blocker?: {
      status: "BLOCKED";
      reason: WorkerBlockerType;
      limitType: string;
      currentUsage: number;
      maxLimit: number;
      nextAction: string;
    };
  } {
    const metrics = this.getOrCreateMetrics(executionId);
    const limits = this.getQuotaLimits(organizationId, executionId);

    if (metrics.toolCalls + 1 > limits.maxToolCalls) {
      return {
        allowed: false,
        blocker: {
          status: "BLOCKED",
          reason: "RESOURCE_LIMIT_REACHED",
          limitType: "maxToolCalls",
          currentUsage: metrics.toolCalls,
          maxLimit: limits.maxToolCalls,
          nextAction: `Increase tool call quota or simplify task objective (limit reached: ${limits.maxToolCalls})`,
        },
      };
    }

    metrics.toolCalls += 1;
    metrics.estimatedCost += 0.08; // Estimated cost per tool call
    this.updateResourceConsumption(metrics);

    return { allowed: true };
  }

  /**
   * Registers a worker execution step and verifies resource limits.
   */
  public trackWorkerExecution(
    executionId: string,
    workerId: string,
    organizationId?: string
  ): {
    allowed: boolean;
    blocker?: {
      status: "BLOCKED";
      reason: WorkerBlockerType;
      limitType: string;
      currentUsage: number;
      maxLimit: number;
      nextAction: string;
    };
  } {
    const metrics = this.getOrCreateMetrics(executionId);
    const limits = this.getQuotaLimits(organizationId, executionId);

    if (metrics.workerExecutions + 1 > limits.maxWorkerExecutions) {
      return {
        allowed: false,
        blocker: {
          status: "BLOCKED",
          reason: "RESOURCE_LIMIT_REACHED",
          limitType: "maxWorkerExecutions",
          currentUsage: metrics.workerExecutions,
          maxLimit: limits.maxWorkerExecutions,
          nextAction: `Task exceeded maximum worker executions (${limits.maxWorkerExecutions}). Stop execution to prevent runaway loops.`,
        },
      };
    }

    metrics.workerExecutions += 1;
    metrics.estimatedCost += 0.20;
    this.updateResourceConsumption(metrics);

    return { allowed: true };
  }

  /**
   * Registers a retry attempt and verifies retry limits.
   */
  public trackRetry(
    executionId: string,
    organizationId?: string
  ): {
    allowed: boolean;
    blocker?: {
      status: "BLOCKED";
      reason: WorkerBlockerType;
      limitType: string;
      currentUsage: number;
      maxLimit: number;
      nextAction: string;
    };
  } {
    const metrics = this.getOrCreateMetrics(executionId);
    const limits = this.getQuotaLimits(organizationId, executionId);

    if (metrics.retryCount + 1 > limits.maxRetries) {
      return {
        allowed: false,
        blocker: {
          status: "BLOCKED",
          reason: "RESOURCE_LIMIT_REACHED",
          limitType: "maxRetries",
          currentUsage: metrics.retryCount,
          maxLimit: limits.maxRetries,
          nextAction: `Task exceeded bounded retry limit (${limits.maxRetries}). Escalating to human authority.`,
        },
      };
    }

    metrics.retryCount += 1;
    return { allowed: true };
  }

  /**
   * Tracks model / LLM token usage and estimated cost.
   */
  public trackModelUsage(
    executionId: string,
    params: { promptTokens?: number; completionTokens?: number; estimatedCost?: number }
  ): void {
    const metrics = this.getOrCreateMetrics(executionId);
    metrics.modelCalls += 1;
    const tokens = (params.promptTokens || 0) + (params.completionTokens || 0);
    metrics.tokensUsed = (metrics.tokensUsed || 0) + tokens;

    if (params.estimatedCost !== undefined) {
      metrics.estimatedCost += params.estimatedCost;
    } else if (tokens > 0) {
      // Rough default estimate when provider pricing is unknown
      metrics.estimatedCost += (tokens / 1000) * 0.005;
    } else {
      metrics.estimatedCost += 0.05;
    }

    this.updateResourceConsumption(metrics);
  }

  /**
   * Updates execution duration and checks timeout limits.
   */
  public checkExecutionDuration(
    executionId: string,
    durationMs: number,
    organizationId?: string
  ): {
    withinLimits: boolean;
    blocker?: {
      status: "BLOCKED";
      reason: WorkerBlockerType;
      limitType: string;
      currentUsage: number;
      maxLimit: number;
      nextAction: string;
    };
  } {
    const metrics = this.getOrCreateMetrics(executionId);
    metrics.executionDurationMs = durationMs;
    const limits = this.getQuotaLimits(organizationId, executionId);

    if (durationMs > limits.maxExecutionTimeMs) {
      return {
        withinLimits: false,
        blocker: {
          status: "BLOCKED",
          reason: "RESOURCE_LIMIT_REACHED",
          limitType: "maxExecutionTimeMs",
          currentUsage: durationMs,
          maxLimit: limits.maxExecutionTimeMs,
          nextAction: `Execution timed out (${durationMs}ms > ${limits.maxExecutionTimeMs}ms). Terminated cleanly.`,
        },
      };
    }

    return { withinLimits: true };
  }

  /**
   * Validates full resource metrics against limits.
   */
  public validateMetrics(
    executionId: string,
    organizationId?: string
  ): { withinLimits: boolean; blocker?: any } {
    const metrics = this.getOrCreateMetrics(executionId);
    const limits = this.getQuotaLimits(organizationId, executionId);

    if (metrics.toolCalls > limits.maxToolCalls) {
      return {
        withinLimits: false,
        blocker: {
          status: "BLOCKED",
          reason: "RESOURCE_LIMIT_REACHED",
          limitType: "maxToolCalls",
          currentUsage: metrics.toolCalls,
          maxLimit: limits.maxToolCalls,
          nextAction: `Exceeded maximum tool calls (${limits.maxToolCalls})`,
        },
      };
    }

    if (metrics.workerExecutions > limits.maxWorkerExecutions) {
      return {
        withinLimits: false,
        blocker: {
          status: "BLOCKED",
          reason: "RESOURCE_LIMIT_REACHED",
          limitType: "maxWorkerExecutions",
          currentUsage: metrics.workerExecutions,
          maxLimit: limits.maxWorkerExecutions,
          nextAction: `Exceeded maximum worker executions (${limits.maxWorkerExecutions})`,
        },
      };
    }

    if (metrics.estimatedCost > limits.maxEstimatedCost) {
      return {
        withinLimits: false,
        blocker: {
          status: "BLOCKED",
          reason: "RESOURCE_LIMIT_REACHED",
          limitType: "maxEstimatedCost",
          currentUsage: metrics.estimatedCost,
          maxLimit: limits.maxEstimatedCost,
          nextAction: `Exceeded estimated cost budget (${limits.maxEstimatedCost})`,
        },
      };
    }

    return { withinLimits: true };
  }

  private updateResourceConsumption(metrics: ResourceUsageMetrics): void {
    if (metrics.workerExecutions >= 6 || metrics.toolCalls >= 18 || metrics.estimatedCost >= 10) {
      metrics.estimatedResourceConsumption = "CRITICAL";
      metrics.taskComplexity = "VERY_HIGH";
    } else if (metrics.workerExecutions >= 4 || metrics.toolCalls >= 10 || metrics.estimatedCost >= 5) {
      metrics.estimatedResourceConsumption = "HIGH";
      metrics.taskComplexity = "HIGH";
    } else if (metrics.workerExecutions >= 2 || metrics.toolCalls >= 4) {
      metrics.estimatedResourceConsumption = "MODERATE";
      metrics.taskComplexity = "MEDIUM";
    } else {
      metrics.estimatedResourceConsumption = "LOW";
      metrics.taskComplexity = "LOW";
    }
  }
}
