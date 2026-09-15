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
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      if (!params.name?.trim()) {
        return { data: null, error: "Automation name is required." };
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
