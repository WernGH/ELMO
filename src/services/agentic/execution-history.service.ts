/**
 * ELMO Phase 3 — Execution History Service (ExecutionHistoryService)
 *
 * Provides persistent audit logging and transparency tracking for all AI-native
 * executions orchestrated under ELMO Central Brain.
 * Enforces strict multi-tenant isolation by organizationId.
 */

import { ExecutionHistoryRecord } from "./types/agentic.types";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

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
   * Caches in memory and persists to Supabase when configured.
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

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      (supabase.from("agent_executions") as any)
        .upsert(
          {
            execution_id: record.executionId,
            organization_id: record.organizationId,
            user_id: record.userId || null,
            request_id: record.requestId || null,
            goal: record.goal || record.objective,
            selected_agents: (record.agentsInvolved || []) as any,
            status: record.status,
            plan: { objective: record.objective, stepsCount: record.stepsCount } as any,
            tool_calls: (record.toolsUsed || []) as any,
            results: (record.artifacts || []) as any,
            verification: null,
            retries: record.retryCount || 0,
            failures: record.error ? [{ message: record.error }] : ([] as any),
            duration_ms: record.durationMs ?? (record.completedAt ? record.completedAt - record.startedAt : null),
            started_at: new Date(record.startedAt).toISOString(),
            completed_at: record.completedAt ? new Date(record.completedAt).toISOString() : null,
            metadata: {
              summary: record.summary,
              completedStepsCount: record.completedStepsCount,
              previewUrl: record.previewUrl,
              approvalStatus: record.approvalStatus,
            } as any,
          },
          { onConflict: "execution_id" }
        )
        .then(({ error }: { error?: { message: string } | null }) => {
          if (error) {
            console.error("[ExecutionHistoryService] Supabase sync error:", error.message);
          }
        });
    }
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
   * Asynchronously retrieves an execution by ID directly from Supabase.
   */
  public async getExecutionFromSupabase(
    executionId: string,
    organizationId: string
  ): Promise<ExecutionHistoryRecord | undefined> {
    if (!isSupabaseConfigured()) {
      return this.getExecution(executionId, organizationId);
    }
    const supabase = createBrowserSupabase();
    const { data, error } = await (supabase.from("agent_executions") as any)
      .select("*")
      .eq("execution_id", executionId)
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) return undefined;
    return {
      executionId: data.execution_id,
      organizationId: data.organization_id,
      userId: data.user_id || "",
      goal: data.goal,
      objective: data.plan?.objective || data.goal,
      status: data.status,
      stepsCount: data.plan?.stepsCount || 0,
      completedStepsCount: data.metadata?.completedStepsCount || 0,
      agentsInvolved: data.selected_agents || [],
      toolsUsed: data.tool_calls || [],
      retryCount: data.retries || 0,
      startedAt: new Date(data.started_at).getTime(),
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
      durationMs: data.duration_ms || undefined,
      summary: data.metadata?.summary || "",
      error: data.failures?.[0]?.message,
      previewUrl: data.metadata?.previewUrl,
      approvalStatus: data.metadata?.approvalStatus || "NONE",
    };
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
   * Asynchronously lists executions directly from Supabase.
   */
  public async listExecutionsFromSupabase(
    organizationId: string,
    limit: number = 20
  ): Promise<ExecutionHistoryRecord[]> {
    if (!isSupabaseConfigured()) {
      return this.listExecutions(organizationId, limit);
    }
    const supabase = createBrowserSupabase();
    const { data, error } = await (supabase.from("agent_executions") as any)
      .select("*")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((d: any) => ({
      executionId: d.execution_id,
      organizationId: d.organization_id,
      goal: d.goal,
      selectedAgents: d.selected_agents || [],
      status: d.status,
      plan: d.plan,
      toolCalls: d.tool_calls || [],
      results: d.results || [],
      verification: d.verification,
      retries: d.retries,
      failures: d.failures || [],
      durationMs: d.duration_ms || undefined,
      startedAt: new Date(d.started_at).getTime(),
      completedAt: d.completed_at ? new Date(d.completed_at).getTime() : undefined,
      metadata: d.metadata || {},
    }));
  }

  /**
   * Clears history (used primarily for test isolation).
   */
  public clearHistory(): void {
    this.history.clear();
  }
}
