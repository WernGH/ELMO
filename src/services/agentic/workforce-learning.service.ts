/**
 * ELMO Phase 4.0.1 — Governed Workforce Learning Service (WorkforceLearningService)
 *
 * Captures controlled workforce learning signals without autonomous self-modification:
 * - CRITICAL RULE: Workers MUST NOT rewrite code, modify prompts, modify security rules,
 *   modify permissions, or create production workers autonomously.
 * - Captures: task success/failure, verification failure, human corrections, human approvals/rejections,
 *   reassignments, missing capabilities/tools, repeated failures, successful patterns.
 * - Routes signals through governed memory policies (facts, preferences, decisions, corrections, outcomes).
 * - Strictly avoids false milestone memories or false workflow-completion memories.
 */

import {
  WorkforceLearningSignal,
  LearningSignalType,
} from "./types/agentic.types";
import { ElmoMemoryService } from "@/services/elmo-memory.service";

export interface RecordLearningSignalParams {
  signalType: LearningSignalType;
  organizationId: string;
  executionId?: string;
  taskId?: string;
  workerId?: string;
  payload: Record<string, unknown>;
  persistToMemory?: boolean;
  governedCategory?: "fact" | "preference" | "decision" | "policy" | "procedure" | "outcome" | "correction";
  memoryTitle?: string;
  memoryContent?: string;
}

export class WorkforceLearningService {
  private static instance: WorkforceLearningService;
  private memoryService: ElmoMemoryService;

  // Stored learning signals in memory: signalId -> WorkforceLearningSignal
  private signals: WorkforceLearningSignal[] = [];

  private constructor() {
    this.memoryService = ElmoMemoryService.getInstance();
  }

  public static getInstance(): WorkforceLearningService {
    if (!WorkforceLearningService.instance) {
      WorkforceLearningService.instance = new WorkforceLearningService();
    }
    return WorkforceLearningService.instance;
  }

  public static resetInstance(): void {
    WorkforceLearningService.instance = undefined as any;
  }

  public reset(): void {
    this.signals = [];
  }

  /**
   * Records a governed learning signal.
   * If flagged for governed memory persistence, routes strictly according to memory policy.
   */
  public async emitSignal(params: RecordLearningSignalParams): Promise<WorkforceLearningSignal> {
    if (!params.organizationId) {
      throw new Error("Learning signals require organizationId for multi-tenant isolation.");
    }

    const signalId = `lsig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    let persisted = false;

    // Check if governed memory persistence is appropriate
    if (params.persistToMemory && params.memoryContent) {
      persisted = await this.persistGovernedMemory(params);
    }

    const record: WorkforceLearningSignal = {
      signalId,
      signalType: params.signalType,
      organizationId: params.organizationId,
      executionId: params.executionId,
      taskId: params.taskId,
      workerId: params.workerId,
      timestamp: now,
      payload: params.payload || {},
      persistedToMemory: persisted,
      governedCategory: params.governedCategory,
    };

    this.signals.push(record);
    return record;
  }

  /**
   * Persists governed context into Company Brain memory while blocking unauthorized mutations.
   */
  private async persistGovernedMemory(params: RecordLearningSignalParams): Promise<boolean> {
    // SECURITY GUARD: Ensure workers cannot inject prompt/security self-edits into memory
    const text = (params.memoryContent || "").toLowerCase();
    const isProhibitedSelfModification =
      text.includes("system prompt") ||
      text.includes("modify permission") ||
      text.includes("bypass approval") ||
      text.includes("disable security") ||
      text.includes("eval(") ||
      text.includes("exec(");

    if (isProhibitedSelfModification) {
      return false;
    }

    try {
      // Map governed category
      let category: "business_fact" | "user_preference" | "decision" | "sop" | "general" = "general";
      if (params.governedCategory === "fact") category = "business_fact";
      else if (params.governedCategory === "preference") category = "user_preference";
      else if (params.governedCategory === "decision") category = "decision";
      else if (params.governedCategory === "policy" || params.governedCategory === "procedure") category = "sop";

      await this.memoryService.createMemory({
        organizationId: params.organizationId,
        title: params.memoryTitle || `Governed Learning: ${params.signalType}`,
        content: params.memoryContent!,
        category,
        confidenceLevel: params.signalType === "HUMAN_CORRECTION" ? "confirmed" : "high",
        importance: params.signalType === "HUMAN_CORRECTION" ? "critical" : "normal",
        metadata: {
          learningSignalType: params.signalType,
          workerId: params.workerId,
          taskId: params.taskId,
          executionId: params.executionId,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves recorded signals for an organization, optionally filtered.
   */
  public getSignals(
    organizationId: string,
    filters?: {
      signalType?: LearningSignalType;
      workerId?: string;
      limit?: number;
    }
  ): WorkforceLearningSignal[] {
    let list = this.signals.filter((s) => s.organizationId === organizationId);

    if (filters?.signalType) {
      list = list.filter((s) => s.signalType === filters.signalType);
    }
    if (filters?.workerId) {
      list = list.filter((s) => s.workerId === filters.workerId);
    }

    const sorted = list.sort((a, b) => b.timestamp - a.timestamp);
    if (filters?.limit) {
      return sorted.slice(0, filters.limit);
    }
    return sorted;
  }
}
