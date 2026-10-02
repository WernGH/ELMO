/**
 * ELMO Phase 3 — Approval Service (ApprovalService)
 *
 * Implements real interactive human-in-the-loop governance for high-risk,
 * external, or irreversible actions (publishing, destructive edits, mass outreach).
 * Enforces strict multi-tenant isolation by organizationId.
 */

import { MockDataStore, ApprovalRow, ApprovalInsert } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ActivityService } from "./activity.service";

export interface RequestApprovalParams {
  organizationId: string;
  userId?: string;
  executionId?: string;
  stepId?: string;
  action: string;
  requestedBy: string;
  category: string;
  riskLevel: "Low" | "Medium" | "High";
  details?: string;
  proposedChanges?: Record<string, unknown>;
}

export class ApprovalService {
  private static instance: ApprovalService;
  private store: MockDataStore;
  private activityService: ActivityService;

  private constructor() {
    this.store = MockDataStore.getInstance();
    this.activityService = ActivityService.getInstance();
  }

  public static getInstance(): ApprovalService {
    if (!ApprovalService.instance) {
      ApprovalService.instance = new ApprovalService();
    }
    return ApprovalService.instance;
  }

  public static resetInstance(): void {
    ApprovalService.instance = undefined as any;
  }

  public async getApprovals(
    userId: string,
    organizationId: string,
    statusFilter?: "pending" | "approved" | "rejected" | "modified"
  ): Promise<ApprovalRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      let query = (supabase.from("approvals") as any)
        .select("*")
        .eq("organization_id", organizationId);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) {
        return data as ApprovalRow[];
      }
    }

    const approvals = this.store.queryApprovalsWithRLS(userId, organizationId);
    if (statusFilter) {
      return approvals.filter((a) => a.status === statusFilter);
    }
    return approvals;
  }

  public async getApprovalById(
    userId: string,
    organizationId: string,
    approvalId: string
  ): Promise<ApprovalRow | null> {
    const list = await this.getApprovals(userId, organizationId);
    return list.find((a) => a.id === approvalId) || null;
  }

  public async createPendingApproval(params: RequestApprovalParams): Promise<ApprovalRow> {
    return this.requestApproval(params);
  }

  public async requestApproval(params: RequestApprovalParams): Promise<ApprovalRow> {
    if (!params.organizationId || !params.action || !params.requestedBy) {
      throw new Error("Missing required approval parameters.");
    }

    const insertData: ApprovalInsert = {
      organization_id: params.organizationId,
      execution_id: params.executionId,
      step_id: params.stepId,
      action: params.action,
      requested_by: params.requestedBy,
      category: params.category,
      risk_level: params.riskLevel,
      details: params.details,
      proposed_changes: params.proposedChanges,
      status: "pending",
    };

    let created: ApprovalRow;

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("approvals") as any).insert(insertData).select().single();
      if (!error && data) {
        created = data as ApprovalRow;
      } else {
        created = this.store.createApproval(insertData);
      }
    } else {
      created = this.store.createApproval(insertData);
    }

    await this.activityService.recordActivity({
      organizationId: params.organizationId,
      type: "approval_requested",
      actorName: params.requestedBy,
      actorType: "AI",
      description: `Approval requested for: "${params.action}" (${params.riskLevel} Risk)`,
      metadata: { approvalId: created.id, executionId: params.executionId },
    });

    return created;
  }

  public async approve(
    approvalId: string,
    userId: string,
    organizationId: string,
    notes?: string
  ): Promise<ApprovalRow> {
    const existing = await this.getApprovalById(userId, organizationId, approvalId);
    if (!existing) {
      throw new Error("Approval request not found or unauthorized.");
    }

    const updates = {
      status: "approved" as const,
      decision_by: userId,
      decision_notes: notes || "Approved by user.",
      decided_at: new Date().toISOString(),
    };

    let updated: ApprovalRow;

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("approvals") as any)
        .update(updates)
        .eq("id", approvalId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (!error && data) {
        updated = data as ApprovalRow;
      } else {
        updated = this.store.updateApproval(userId, organizationId, approvalId, updates)!;
      }
    } else {
      updated = this.store.updateApproval(userId, organizationId, approvalId, updates)!;
    }

    await this.activityService.recordActivity({
      organizationId,
      userId,
      type: "approval_granted",
      actorName: "Human Owner",
      actorType: "HUMAN",
      description: `Approved action: "${existing.action}"`,
      metadata: { approvalId, executionId: existing.execution_id },
    });

    return updated;
  }

  public async modify(
    approvalId: string,
    userId: string,
    organizationId: string,
    modificationNotes: string
  ): Promise<ApprovalRow> {
    const existing = await this.getApprovalById(userId, organizationId, approvalId);
    if (!existing) {
      throw new Error("Approval request not found or unauthorized.");
    }

    const updates = {
      status: "modified" as const,
      decision_by: userId,
      decision_notes: modificationNotes,
      decided_at: new Date().toISOString(),
    };

    let updated: ApprovalRow;

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("approvals") as any)
        .update(updates)
        .eq("id", approvalId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (!error && data) {
        updated = data as ApprovalRow;
      } else {
        updated = this.store.updateApproval(userId, organizationId, approvalId, updates)!;
      }
    } else {
      updated = this.store.updateApproval(userId, organizationId, approvalId, updates)!;
    }

    await this.activityService.recordActivity({
      organizationId,
      userId,
      type: "approval_modified",
      actorName: "Human Owner",
      actorType: "HUMAN",
      description: `Requested modifications for: "${existing.action}": ${modificationNotes}`,
      metadata: { approvalId, executionId: existing.execution_id, modificationNotes },
    });

    return updated;
  }

  public async cancel(
    approvalId: string,
    userId: string,
    organizationId: string,
    reason?: string
  ): Promise<ApprovalRow> {
    const existing = await this.getApprovalById(userId, organizationId, approvalId);
    if (!existing) {
      throw new Error("Approval request not found or unauthorized.");
    }

    const updates = {
      status: "rejected" as const,
      decision_by: userId,
      decision_notes: reason || "Cancelled by user.",
      decided_at: new Date().toISOString(),
    };

    let updated: ApprovalRow;

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("approvals") as any)
        .update(updates)
        .eq("id", approvalId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (!error && data) {
        updated = data as ApprovalRow;
      } else {
        updated = this.store.updateApproval(userId, organizationId, approvalId, updates)!;
      }
    } else {
      updated = this.store.updateApproval(userId, organizationId, approvalId, updates)!;
    }

    await this.activityService.recordActivity({
      organizationId,
      userId,
      type: "approval_cancelled",
      actorName: "Human Owner",
      actorType: "HUMAN",
      description: `Cancelled action: "${existing.action}". Reason: ${reason || "User decision"}`,
      metadata: { approvalId, executionId: existing.execution_id },
    });

    return updated;
  }
}
