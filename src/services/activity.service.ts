/**
 * ELMO Phase 3 — Activity Timeline Service (ActivityService)
 *
 * Implements an immutable, organization-scoped timeline of key AI workforce actions,
 * human decisions, lead conversions, and milestone completions.
 * Enforces strict multi-tenant isolation by organizationId.
 */

import { MockDataStore, ActivityRow, ActivityInsert } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface RecordActivityParams {
  organizationId: string;
  userId?: string;
  type: string;
  actorName: string;
  actorType?: "AI" | "HUMAN" | "SYSTEM" | "VISITOR";
  description: string;
  metadata?: Record<string, unknown>;
}

export class ActivityService {
  private static instance: ActivityService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  public static resetInstance(): void {
    ActivityService.instance = undefined as any;
  }

  public async getActivities(
    userId: string,
    organizationId: string,
    limit = 50
  ): Promise<ActivityRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("activities") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data as ActivityRow[];
      }
    }
    return this.store.queryActivitiesWithRLS(userId, organizationId, limit);
  }

  public async recordActivity(params: RecordActivityParams): Promise<ActivityRow> {
    if (!params.organizationId || !params.description || !params.type) {
      throw new Error("Missing required activity parameters.");
    }

    const insertData: ActivityInsert = {
      organization_id: params.organizationId,
      user_id: params.userId,
      type: params.type,
      actor_name: params.actorName,
      actor_type: params.actorType || "AI",
      description: params.description,
      metadata: params.metadata || {},
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("activities") as any).insert(insertData).select().single();
      if (!error && data) {
        return data as ActivityRow;
      }
    }

    return this.store.createActivity(insertData);
  }

  public async logActivity(params: RecordActivityParams): Promise<ActivityRow> {
    return this.recordActivity(params);
  }
}
