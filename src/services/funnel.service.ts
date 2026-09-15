/**
 * ELMO Phase 1 — Funnel Service
 * Authoritative business service for multi-tenant Funnels, Funnel Steps, and Structured Business Context.
 */

import { MockDataStore, FunnelRow, FunnelStepRow } from "@/lib/supabase/mock-store";
import { FunnelType, FunnelStatus, FunnelBusinessContext, StepType } from "@/types/database.types";

export interface CreateFunnelParams {
  userId: string;
  organizationId: string;
  name: string;
  description?: string;
  goal?: string;
  funnelType?: FunnelType;
  targetAudience?: string;
  offer?: string;
  primaryConversionGoal?: string;
  status?: FunnelStatus;
  businessContext?: FunnelBusinessContext;
  settings?: Record<string, unknown>;
}

export interface UpdateFunnelParams {
  userId: string;
  organizationId: string;
  funnelId: string;
  name?: string;
  description?: string;
  goal?: string;
  funnelType?: FunnelType;
  targetAudience?: string;
  offer?: string;
  primaryConversionGoal?: string;
  status?: FunnelStatus;
  businessContext?: FunnelBusinessContext;
  settings?: Record<string, unknown>;
}

export interface CreateFunnelStepParams {
  userId: string;
  organizationId: string;
  funnelId: string;
  stepOrder?: number;
  stepType: StepType;
  name: string;
  pageId?: string;
  goal?: string;
  settings?: Record<string, unknown>;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export class FunnelService {
  private static instance: FunnelService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): FunnelService {
    if (!FunnelService.instance) {
      FunnelService.instance = new FunnelService();
    }
    return FunnelService.instance;
  }

  public async getFunnels(userId: string, organizationId: string): Promise<ServiceResult<FunnelRow[]>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const funnels = this.store.queryFunnelsWithRLS(userId, organizationId);
      return { data: funnels, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getFunnelById(
    userId: string,
    organizationId: string,
    funnelId: string
  ): Promise<ServiceResult<FunnelRow>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const funnel = this.store.getFunnelWithRLS(userId, organizationId, funnelId);
      if (!funnel) {
        return { data: null, error: "Funnel not found." };
      }
      return { data: funnel, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createFunnel(params: CreateFunnelParams): Promise<ServiceResult<FunnelRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      if (!params.name?.trim()) {
        return { data: null, error: "Funnel name is required." };
      }

      const businessContext = {
        business_goal: params.goal || params.businessContext?.business_goal || "",
        funnel_goal: params.goal || params.businessContext?.funnel_goal || "",
        target_audience: params.targetAudience || params.businessContext?.target_audience || "",
        offer: params.offer || params.businessContext?.offer || "",
        problem: params.businessContext?.problem || "",
        desired_outcome: params.businessContext?.desired_outcome || "",
        traffic_source: params.businessContext?.traffic_source || "",
        conversion_goal: params.primaryConversionGoal || params.businessContext?.conversion_goal || "",
        customer_journey: params.businessContext?.customer_journey || "",
        primary_cta: params.businessContext?.primary_cta || "",
        business_model: params.businessContext?.business_model || "",
        funnel_type: params.funnelType || "Lead Generation",
        current_status: params.status || "draft",
        ...params.businessContext,
      };

      const created = this.store.createFunnel({
        organization_id: params.organizationId,
        name: params.name.trim(),
        description: params.description || null,
        goal: params.goal || null,
        funnel_type: params.funnelType || "Lead Generation",
        target_audience: params.targetAudience || null,
        offer: params.offer || null,
        primary_conversion_goal: params.primaryConversionGoal || null,
        status: params.status || "draft",
        business_context: businessContext,
        settings: params.settings || {},
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async updateFunnel(params: UpdateFunnelParams): Promise<ServiceResult<FunnelRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const existing = this.store.getFunnelWithRLS(params.userId, params.organizationId, params.funnelId);
      if (!existing) {
        return { data: null, error: "Funnel not found or access denied." };
      }

      const updates: Partial<FunnelRow> = {};
      if (params.name !== undefined) updates.name = params.name.trim();
      if (params.description !== undefined) updates.description = params.description;
      if (params.goal !== undefined) updates.goal = params.goal;
      if (params.funnelType !== undefined) updates.funnel_type = params.funnelType;
      if (params.targetAudience !== undefined) updates.target_audience = params.targetAudience;
      if (params.offer !== undefined) updates.offer = params.offer;
      if (params.primaryConversionGoal !== undefined) updates.primary_conversion_goal = params.primaryConversionGoal;
      if (params.status !== undefined) updates.status = params.status;
      if (params.settings !== undefined) updates.settings = params.settings;
      if (params.businessContext !== undefined) {
        updates.business_context = {
          ...(existing.business_context as Record<string, unknown>),
          ...params.businessContext,
        };
      }

      const updated = this.store.updateFunnel(params.userId, params.organizationId, params.funnelId, updates);
      return { data: updated, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async deleteFunnel(
    userId: string,
    organizationId: string,
    funnelId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const success = this.store.deleteFunnel(userId, organizationId, funnelId);
      if (!success) {
        return { data: null, error: "Funnel could not be deleted or not found." };
      }
      return { data: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  // Funnel Steps
  public async getFunnelSteps(
    userId: string,
    organizationId: string,
    funnelId: string
  ): Promise<ServiceResult<FunnelStepRow[]>> {
    try {
      const steps = this.store.queryFunnelStepsWithRLS(userId, organizationId, funnelId);
      return { data: steps, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createFunnelStep(params: CreateFunnelStepParams): Promise<ServiceResult<FunnelStepRow>> {
    try {
      const funnel = this.store.getFunnelWithRLS(params.userId, params.organizationId, params.funnelId);
      if (!funnel) {
        return { data: null, error: "Funnel not found or access denied." };
      }

      // Automatically determine step order if not specified
      const currentSteps = this.store.queryFunnelStepsWithRLS(params.userId, params.organizationId, params.funnelId);
      const nextOrder = params.stepOrder ?? (currentSteps.length > 0 ? Math.max(...currentSteps.map((s) => s.step_order)) + 1 : 1);

      const created = this.store.createFunnelStep({
        funnel_id: params.funnelId,
        step_order: nextOrder,
        step_type: params.stepType,
        name: params.name,
        page_id: params.pageId || null,
        goal: params.goal || null,
        settings: params.settings || {},
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async deleteFunnelStep(
    userId: string,
    organizationId: string,
    stepId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const success = this.store.deleteFunnelStep(userId, organizationId, stepId);
      if (!success) {
        return { data: null, error: "Step could not be deleted or not found." };
      }
      return { data: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }
}
