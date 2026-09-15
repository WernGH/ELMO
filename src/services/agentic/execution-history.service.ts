/**
 * ELMO Phase 3 — Execution History Service (ExecutionHistoryService)
 *
 * Provides persistent audit logging and transparency tracking for all AI-native
 * executions orchestrated under ELMO Central Brain.
 * Enforces strict multi-tenant isolation by organizationId.
 */

import { ExecutionHistoryRecord } from "./types/agentic.types";

export class ExecutionHistoryService {
  private static instance: ExecutionHistoryService;

  // Stored executions: organizationId -> Map<executionId, ExecutionHistoryRecord>
  private history: Map<string, Map<string, ExecutionHistoryRecord>> = new Map();

  private constructor() {}

  public static getInstance(): ExecutionHistoryService {
    if (!ExecutionHistoryService.instance) {
      ExecutionHistoryService.instance = new ExecutionHistoryService();
    }
    return ExecutionHistoryService.instance;
  }

  public static resetInstance(): void {
    ExecutionHistoryService.instance = undefined as any;
  }

  public reset(): void {
    this.history.clear();
  }

  /**
   * Records or updates an execution record for a tenant.
   */
  public recordExecution(record: ExecutionHistoryRecord): void {
    if (!record.organizationId || !record.executionId) {
      throw new Error("Execution record must include valid organizationId and executionId.");
    }

    if (!this.history.has(record.organizationId)) {
      this.history.set(record.organizationId, new Map());
    }

    const orgMap = this.history.get(record.organizationId)!;
    orgMap.set(record.executionId, {
      ...record,
      durationMs: record.completedAt ? record.completedAt - record.startedAt : undefined,
    });
  }

  /**
   * Retrieves a specific execution by ID, ensuring tenant isolation.
   */
  public getExecution(executionId: string, organizationId: string): ExecutionHistoryRecord | undefined {
    const orgMap = this.history.get(organizationId);
    if (!orgMap) return undefined;
    return orgMap.get(executionId);
  }

  /**
   * Lists recent executions for an organization in reverse chronological order.
   */
  public listExecutions(organizationId: string, limit: number = 20): ExecutionHistoryRecord[] {
    const orgMap = this.history.get(organizationId);
    if (!orgMap) return [];

    const list = Array.from(orgMap.values());
    list.sort((a, b) => b.startedAt - a.startedAt);
    return list.slice(0, limit);
  }

  /**
   * Clears history (used primarily for test isolation).
   */
  public clearHistory(): void {
    this.history.clear();
  }
}
