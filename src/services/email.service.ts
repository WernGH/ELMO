/**
 * ELMO Phase 1 — Email Service Foundation
 * Authoritative business service for Email Templates, Email Sequences, and Sequence Steps.
 * Prepares the architectural foundation for delayed sequence scheduling without requiring live delivery in Phase 1.
 */

import {
  MockDataStore,
  EmailTemplateRow,
  EmailSequenceRow,
  EmailSequenceStepRow,
} from "@/lib/supabase/mock-store";
import { EmailTemplateStatus, EmailSequenceStatus, DelayUnit } from "@/types/database.types";
import { ServiceResult } from "./funnel.service";

export interface CreateEmailTemplateParams {
  userId: string;
  organizationId: string;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  status?: EmailTemplateStatus;
}

export interface CreateEmailSequenceParams {
  userId: string;
  organizationId: string;
  name: string;
  description?: string;
  status?: EmailSequenceStatus;
}

export interface CreateSequenceStepParams {
  userId: string;
  organizationId: string;
  sequenceId: string;
  stepOrder?: number;
  delayValue: number;
  delayUnit: DelayUnit;
  subject: string;
  body: string;
  templateId?: string;
}

export class EmailService {
  private static instance: EmailService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // 1. Templates
  public async getTemplates(
    userId: string,
    organizationId: string
  ): Promise<ServiceResult<EmailTemplateRow[]>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const templates = this.store.queryEmailTemplatesWithRLS(userId, organizationId);
      return { data: templates, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createTemplate(params: CreateEmailTemplateParams): Promise<ServiceResult<EmailTemplateRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      if (!params.name?.trim() || !params.subject?.trim()) {
        return { data: null, error: "Template name and subject are required." };
      }

      const created = this.store.createEmailTemplate({
        organization_id: params.organizationId,
        name: params.name.trim(),
        subject: params.subject.trim(),
        body: params.body,
        variables: params.variables || [],
        status: params.status || "draft",
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async updateTemplate(
    params: {
      userId: string;
      organizationId: string;
      templateId: string;
      name?: string;
      subject?: string;
      body?: string;
      variables?: string[];
      status?: EmailTemplateStatus;
    }
  ): Promise<ServiceResult<EmailTemplateRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const existing = this.store.emailTemplates.get(params.templateId);
      if (!existing || existing.organization_id !== params.organizationId) {
        return { data: null, error: "Template not found." };
      }
      const updated = this.store.updateEmailTemplate(params.templateId, {
        name: params.name?.trim() || existing.name,
        subject: params.subject?.trim() || existing.subject,
        body: params.body ?? existing.body,
        variables: params.variables ?? existing.variables,
        status: params.status ?? existing.status,
      });
      return { data: updated, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  // 2. Sequences
  public async getSequences(
    userId: string,
    organizationId: string
  ): Promise<ServiceResult<EmailSequenceRow[]>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const sequences = this.store.queryEmailSequencesWithRLS(userId, organizationId);
      return { data: sequences, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createSequence(params: CreateEmailSequenceParams): Promise<ServiceResult<EmailSequenceRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      if (!params.name?.trim()) {
        return { data: null, error: "Sequence name is required." };
      }

      const created = this.store.createEmailSequence({
        organization_id: params.organizationId,
        name: params.name.trim(),
        description: params.description || null,
        status: params.status || "draft",
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  // 3. Sequence Steps
  public async getSequenceSteps(
    userId: string,
    organizationId: string,
    sequenceId: string
  ): Promise<ServiceResult<EmailSequenceStepRow[]>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const steps = this.store.queryEmailSequenceStepsWithRLS(userId, organizationId, sequenceId);
      return { data: steps, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async addSequenceStep(params: CreateSequenceStepParams): Promise<ServiceResult<EmailSequenceStepRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const existingSteps = this.store.queryEmailSequenceStepsWithRLS(
        params.userId,
        params.organizationId,
        params.sequenceId
      );
      const nextOrder =
        params.stepOrder ??
        (existingSteps.length > 0 ? Math.max(...existingSteps.map((s) => s.step_order)) + 1 : 1);

      const created = this.store.createEmailSequenceStep({
        sequence_id: params.sequenceId,
        step_order: nextOrder,
        delay_value: params.delayValue,
        delay_unit: params.delayUnit,
        subject: params.subject,
        body: params.body,
        template_id: params.templateId || null,
        status: "active",
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  /**
   * Helper: Calculates cumulative delay in milliseconds from a list of steps
   */
  public calculateStepDelayMs(delayValue: number, delayUnit: DelayUnit): number {
    switch (delayUnit) {
      case "minutes":
        return delayValue * 60 * 1000;
      case "hours":
        return delayValue * 60 * 60 * 1000;
      case "days":
        return delayValue * 24 * 60 * 60 * 1000;
      case "weeks":
        return delayValue * 7 * 24 * 60 * 60 * 1000;
      default:
        return delayValue * 60 * 60 * 1000;
    }
  }
}
