/**
 * ELMO Phase 3 — Goal Service (GoalService)
 *
 * Authoritative business service for managing strategic business goals set by
 * the Human Owner or planned by ELMO Central Brain.
 * Enforces strict multi-tenant isolation by organizationId.
 */

import { MockDataStore, GoalRow, GoalInsert } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CreateGoalParams {
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  metric?: string;
  target?: number;
  currentValue?: number;
  deadline?: string;
  relatedExecutionId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateGoalProgressParams {
  userId: string;
  organizationId: string;
  goalId: string;
  currentValue: number;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BEHIND" | "CANCELLED";
  notes?: string;
}

export class GoalService {
  private static instance: GoalService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): GoalService {
    if (!GoalService.instance) {
      GoalService.instance = new GoalService();
    }
    return GoalService.instance;
  }

  public static resetInstance(): void {
    GoalService.instance = undefined as any;
  }

  public async getGoals(userId: string, organizationId: string): Promise<GoalRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("goals") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as GoalRow[];
      }
    }
    return this.store.queryGoalsWithRLS(userId, organizationId);
  }

  public async getGoalById(userId: string, organizationId: string, goalId: string): Promise<GoalRow | null> {
    const goals = await this.getGoals(userId, organizationId);
    return goals.find((g) => g.id === goalId) || null;
  }

  public async createGoal(params: CreateGoalParams): Promise<GoalRow> {
    if (!params.organizationId || !params.title) {
      throw new Error("Missing required goal parameters: organizationId and title are required.");
    }

    const insertData: GoalInsert = {
      organization_id: params.organizationId,
      user_id: params.userId,
      title: params.title.trim(),
      description: params.description,
      metric: params.metric,
      target: params.target,
      current_value: params.currentValue ?? 0,
      deadline: params.deadline,
      status: "IN_PROGRESS",
      related_execution_id: params.relatedExecutionId,
      metadata: params.metadata || {},
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("goals") as any).insert(insertData).select().single();
      if (!error && data) {
        return data as GoalRow;
      }
    }

    return this.store.createGoal(insertData);
  }

  public async updateGoalProgress(params: UpdateGoalProgressParams): Promise<GoalRow | null> {
    const existing = await this.getGoalById(params.userId, params.organizationId, params.goalId);
    if (!existing) {
      throw new Error("Goal not found or unauthorized.");
    }

    let status = params.status || existing.status;
    if (existing.target && params.currentValue >= existing.target) {
      status = "COMPLETED";
    }

    const updates = {
      current_value: params.currentValue,
      status,
      metadata: {
        ...(existing.metadata || {}),
        lastProgressUpdate: new Date().toISOString(),
        notes: params.notes,
      },
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("goals") as any)
        .update(updates)
        .eq("id", params.goalId)
        .eq("organization_id", params.organizationId)
        .select()
        .single();

      if (!error && data) {
        return data as GoalRow;
      }
    }

    return this.store.updateGoal(params.userId, params.organizationId, params.goalId, updates);
  }

  public async deleteGoal(userId: string, organizationId: string, goalId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { error } = await (supabase.from("goals") as any)
        .delete()
        .eq("id", goalId)
        .eq("organization_id", organizationId);
      if (!error) return true;
    }
    return this.store.deleteGoal(userId, organizationId, goalId);
  }
}
