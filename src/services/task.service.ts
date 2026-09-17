/**
 * ELMO Phase 3 — Task Service (TaskService)
 *
 * Operational task engine managing work items delegated by ELMO Central Brain
 * to AI specialists or human collaborators.
 * Enforces strict multi-tenant isolation by organizationId.
 */

import { MockDataStore, TaskRow, TaskInsert } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ExecutionPlan } from "./agentic/types/agentic.types";

export interface CreateTaskParams {
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  goalId?: string;
  executionId?: string;
  ownerType?: "AI" | "HUMAN";
  ownerName?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "CANCELLED";
}

export class TaskService {
  private static instance: TaskService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  public static resetInstance(): void {
    TaskService.instance = undefined as any;
  }

  public async getTasks(userId: string, organizationId: string, goalId?: string): Promise<TaskRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      let query = (supabase.from("tasks") as any)
        .select("*")
        .eq("organization_id", organizationId);

      if (goalId) {
        query = query.eq("goal_id", goalId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) {
        return data as TaskRow[];
      }
    }
    return this.store.queryTasksWithRLS(userId, organizationId, goalId);
  }

  public async getTaskById(userId: string, organizationId: string, taskId: string): Promise<TaskRow | null> {
    const tasks = await this.getTasks(userId, organizationId);
    return tasks.find((t) => t.id === taskId) || null;
  }

  public async createTask(params: CreateTaskParams): Promise<TaskRow> {
    if (!params.organizationId || !params.title) {
      throw new Error("Missing required task parameters: organizationId and title are required.");
    }

    const insertData: TaskInsert = {
      organization_id: params.organizationId,
      goal_id: params.goalId,
      execution_id: params.executionId,
      title: params.title.trim(),
      description: params.description,
      owner_type: params.ownerType || "AI",
      owner_name: params.ownerName || "ELMO",
      priority: params.priority || "MEDIUM",
      status: params.status || "PENDING",
      due_date: params.dueDate,
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("tasks") as any).insert(insertData).select().single();
      if (!error && data) {
        return data as TaskRow;
      }
    }

    return this.store.createTask(insertData);
  }

  public async updateTaskStatus(
    userId: string,
    organizationId: string,
    taskId: string,
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "CANCELLED",
    result?: Record<string, unknown>
  ): Promise<TaskRow | null> {
    const existing = await this.getTaskById(userId, organizationId, taskId);
    if (!existing) {
      throw new Error("Task not found or unauthorized.");
    }

    const updates = {
      status,
      result: result || existing.result,
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("tasks") as any)
        .update(updates)
        .eq("id", taskId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (!error && data) {
        return data as TaskRow;
      }
    }

    return this.store.updateTask(userId, organizationId, taskId, updates);
  }

  /**
   * Decomposes an ExecutionPlan into discrete inspectable tasks.
   */
  public async decomposePlanIntoTasks(
    userId: string,
    organizationId: string,
    plan: ExecutionPlan,
    goalId?: string
  ): Promise<TaskRow[]> {
    const tasks: TaskRow[] = [];

    for (const step of plan.steps) {
      const task = await this.createTask({
        userId,
        organizationId,
        goalId,
        executionId: plan.executionId,
        title: `${step.agentName}: ${step.task}`,
        description: `Delegated to ${step.agentName}. Risk: ${step.riskLevel}. Requires Approval: ${step.approvalRequired}`,
        ownerType: "AI",
        ownerName: step.agentName,
        priority: step.riskLevel === "HIGH" ? "HIGH" : "MEDIUM",
        status: step.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
      });
      tasks.push(task);
    }

    return tasks;
  }
}
