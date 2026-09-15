/**
 * ELMO Phase 1 — Automation Service Foundation
 * Prepares the architectural foundation: TRIGGER -> CONDITION -> ACTION.
 * Creates and inspects automation definitions without executing complex live background engines in Phase 1.
 */

import {
  MockDataStore,
  AutomationRow,
  AutomationTriggerRow,
  AutomationConditionRow,
  AutomationActionRow,
} from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { AutomationStatus } from "@/types/database.types";
import { ServiceResult } from "./funnel.service";

export interface CreateAutomationParams {
  userId: string;
  organizationId: string;
  name: string;
  description?: string;
  status?: AutomationStatus;
  trigger?: {
    type: string;
    config?: Record<string, unknown>;
  };
  conditions?: {
    type: string;
    config?: Record<string, unknown>;
    order?: number;
  }[];
  actions?: {
    type: string;
    config?: Record<string, unknown>;
    order?: number;
  }[];
}

export interface AutomationWithNodes extends AutomationRow {
  triggers: AutomationTriggerRow[];
  conditions: AutomationConditionRow[];
  actions: AutomationActionRow[];
}

export class AutomationService {
  private static instance: AutomationService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): AutomationService {
    if (!AutomationService.instance) {
      AutomationService.instance = new AutomationService();
    }
    return AutomationService.instance;
  }

  public async getAutomations(
    userId: string,
    organizationId: string
  ): Promise<ServiceResult<AutomationWithNodes[]>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data: automations, error: autoErr } = await (supabase.from("automations") as any)
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (autoErr || !automations) return { data: null, error: autoErr?.message || "Failed to load automations." };

        const result: AutomationWithNodes[] = [];
        for (const a of automations) {
          const [trigs, conds, acts] = await Promise.all([
            (supabase.from("automation_triggers") as any).select("*").eq("automation_id", a.id),
            (supabase.from("automation_conditions") as any).select("*").eq("automation_id", a.id).order("step_order", { ascending: true }),
            (supabase.from("automation_actions") as any).select("*").eq("automation_id", a.id).order("step_order", { ascending: true }),
          ]);
          result.push({
            ...a,
            triggers: (trigs.data as AutomationTriggerRow[]) || [],
            conditions: (conds.data as AutomationConditionRow[]) || [],
            actions: (acts.data as AutomationActionRow[]) || [],
          });
        }
        return { data: result, error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const automations = this.store.queryAutomationsWithRLS(userId, organizationId);
      const withNodes: AutomationWithNodes[] = automations.map((a) => {
        const triggers = Array.from(this.store.automationTriggers.values()).filter(
          (t) => t.automation_id === a.id
        );
        const conditions = Array.from(this.store.automationConditions.values()).filter(
          (c) => c.automation_id === a.id
        );
        const actions = Array.from(this.store.automationActions.values()).filter(
          (act) => act.automation_id === a.id
        );
        return {
          ...a,
          triggers,
          conditions,
          actions,
        };
      });
      return { data: withNodes, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createAutomation(params: CreateAutomationParams): Promise<ServiceResult<AutomationWithNodes>> {
    try {
      if (!params.name?.trim()) {
        return { data: null, error: "Automation name is required." };
      }

      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data: auto, error: autoErr } = await (supabase.from("automations") as any)
          .insert({
            organization_id: params.organizationId,
            name: params.name.trim(),
            description: params.description || null,
            status: params.status || "draft",
          })
          .select()
          .single();

        if (autoErr || !auto) return { data: null, error: autoErr?.message || "Failed to create automation." };

        const triggers: AutomationTriggerRow[] = [];
        if (params.trigger) {
          const { data: trig } = await (supabase.from("automation_triggers") as any)
            .insert({
              automation_id: auto.id,
              trigger_type: params.trigger.type,
              config: params.trigger.config || {},
            })
            .select()
            .single();
          if (trig) triggers.push(trig as AutomationTriggerRow);
        }

        const conditions: AutomationConditionRow[] = [];
        if (params.conditions) {
          for (let i = 0; i < params.conditions.length; i++) {
            const c = params.conditions[i];
            const { data: cond } = await (supabase.from("automation_conditions") as any)
              .insert({
                automation_id: auto.id,
                condition_type: c.type,
                config: c.config || {},
                step_order: c.order ?? i + 1,
              })
              .select()
              .single();
            if (cond) conditions.push(cond as AutomationConditionRow);
          }
        }

        const actions: AutomationActionRow[] = [];
        if (params.actions) {
          for (let i = 0; i < params.actions.length; i++) {
            const a = params.actions[i];
            const { data: act } = await (supabase.from("automation_actions") as any)
              .insert({
                automation_id: auto.id,
                action_type: a.type,
                config: a.config || {},
                step_order: a.order ?? i + 1,
              })
              .select()
              .single();
            if (act) actions.push(act as AutomationActionRow);
          }
        }

        return {
          data: {
            ...auto,
            triggers,
            conditions,
            actions,
          },
          error: null,
        };
      }

      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const auto = this.store.createAutomation({
        organization_id: params.organizationId,
        name: params.name.trim(),
        description: params.description || null,
        status: params.status || "draft",
      });

      const triggers: AutomationTriggerRow[] = [];
      if (params.trigger) {
        const trig = this.store.createAutomationTrigger({
          automation_id: auto.id,
          trigger_type: params.trigger.type,
          config: params.trigger.config || {},
        });
        triggers.push(trig);
      }

      const conditions: AutomationConditionRow[] = [];
      if (params.conditions) {
        for (let i = 0; i < params.conditions.length; i++) {
          const c = params.conditions[i];
          const cond = this.store.createAutomationCondition({
            automation_id: auto.id,
            condition_type: c.type,
            config: c.config || {},
            step_order: c.order ?? i + 1,
          });
          conditions.push(cond);
        }
      }

      const actions: AutomationActionRow[] = [];
      if (params.actions) {
        for (let i = 0; i < params.actions.length; i++) {
          const a = params.actions[i];
          const act = this.store.createAutomationAction({
            automation_id: auto.id,
            action_type: a.type,
            config: a.config || {},
            step_order: a.order ?? i + 1,
          });
          actions.push(act);
        }
      }

      return {
        data: {
          ...auto,
          triggers,
          conditions,
          actions,
        },
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async activateAutomation(
    userId: string,
    organizationId: string,
    automationId: string
  ): Promise<ServiceResult<AutomationRow>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("automations") as any)
          .update({ status: "active" })
          .eq("id", automationId)
          .eq("organization_id", organizationId)
          .select()
          .single();

        if (error || !data) return { data: null, error: error?.message || "Automation not found." };
        return { data: data as AutomationRow, error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const existing = this.store.automations.get(automationId);
      if (!existing || existing.organization_id !== organizationId) {
        return { data: null, error: "Automation not found." };
      }
      const updated: AutomationRow = {
        ...existing,
        status: "active",
        updated_at: new Date().toISOString(),
      };
      this.store.automations.set(automationId, updated);
      return { data: updated, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }
}
