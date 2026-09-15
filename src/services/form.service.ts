/**
 * ELMO Phase 1 — Form Service
 * Authoritative business service for Forms and Submissions.
 * Orchestrates: FORM SUBMITTED -> CREATE CONTACT -> ADD TAG -> RECORD EVENTS.
 */

import { MockDataStore, FormRow, FormSubmissionRow } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ContactService } from "./contact.service";
import { ServiceResult } from "./funnel.service";

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormSubmitAction {
  add_tags?: string[];
  redirect_url?: string;
  success_message?: string;
  trigger_automation_id?: string;
  email_sequence_id?: string;
}

export interface CreateFormParams {
  userId: string;
  organizationId: string;
  pageId?: string;
  name: string;
  fields: FormFieldDefinition[];
  settings?: Record<string, unknown>;
  submitAction?: FormSubmitAction;
}

export interface SubmitFormParams {
  organizationId: string;
  formId: string;
  submissionData: Record<string, unknown>;
  pageId?: string;
  funnelId?: string;
}

export interface FormSubmissionResult {
  submission: FormSubmissionRow;
  contactId: string | null;
  submitAction: FormSubmitAction;
}

export class FormService {
  private static instance: FormService;
  private store: MockDataStore;
  private contactService: ContactService;

  private constructor() {
    this.store = MockDataStore.getInstance();
    this.contactService = ContactService.getInstance();
  }

  public static getInstance(): FormService {
    if (!FormService.instance) {
      FormService.instance = new FormService();
    }
    return FormService.instance;
  }

  public async getForms(
    userId: string,
    organizationId: string,
    pageId?: string
  ): Promise<ServiceResult<FormRow[]>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        let q = (supabase.from("forms") as any)
          .select("*")
          .eq("organization_id", organizationId);
        if (pageId) q = q.eq("page_id", pageId);
        const { data, error } = await q;
        if (error) return { data: null, error: error.message };
        return { data: (data as FormRow[]) || [], error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const forms = this.store.queryFormsWithRLS(userId, organizationId, pageId);
      return { data: forms, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createForm(params: CreateFormParams): Promise<ServiceResult<FormRow>> {
    try {
      if (!params.name?.trim()) {
        return { data: null, error: "Form name is required." };
      }

      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("forms") as any)
          .insert({
            organization_id: params.organizationId,
            page_id: params.pageId || null,
            name: params.name.trim(),
            fields: params.fields || [],
            settings: params.settings || {},
            submit_action: (params.submitAction as Record<string, unknown>) || {},
          })
          .select()
          .single();

        if (error || !data) return { data: null, error: error?.message || "Failed to create form." };
        return { data: data as FormRow, error: null };
      }

      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const form = this.store.createForm({
        organization_id: params.organizationId,
        page_id: params.pageId || null,
        name: params.name.trim(),
        fields: params.fields || [],
        settings: params.settings || {},
        submit_action: (params.submitAction as Record<string, unknown>) || {},
      });

      return { data: form, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async updateForm(params: {
    userId: string;
    organizationId: string;
    formId: string;
    updates: Partial<FormRow>;
  }): Promise<ServiceResult<FormRow>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("forms") as any)
          .update(params.updates)
          .eq("id", params.formId)
          .eq("organization_id", params.organizationId)
          .select()
          .single();
        if (error || !data) return { data: null, error: error?.message || "Failed to update form." };
        return { data: data as FormRow, error: null };
      }

      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const updated = this.store.updateForm(
        params.userId,
        params.organizationId,
        params.formId,
        params.updates
      );
      if (!updated) {
        return { data: null, error: "Form not found or access denied." };
      }
      return { data: updated, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async submitForm(params: SubmitFormParams): Promise<ServiceResult<FormSubmissionResult>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data: form } = await (supabase.from("forms") as any)
          .select("*")
          .eq("id", params.formId)
          .eq("organization_id", params.organizationId)
          .single();

        if (!form) return { data: null, error: "Form not found." };

        const rawData = params.submissionData || {};
        const emailValue = (rawData.email as string)?.trim().toLowerCase();
        let contactId: string | null = null;
        const submitAction = (form.submit_action as FormSubmitAction) || {};

        if (emailValue) {
          const firstName = (rawData.firstName || rawData.first_name || rawData.name) as string | undefined;
          const lastName = (rawData.lastName || rawData.last_name) as string | undefined;
          const phone = (rawData.phone || rawData.tel) as string | undefined;

          const contactRes = await this.contactService.findOrCreateContact({
            userId: "00000000-0000-0000-0000-000000000001",
            organizationId: params.organizationId,
            email: emailValue,
            firstName,
            lastName,
            phone,
            source: `Form: ${form.name}`,
            tags: submitAction.add_tags || [],
            customFields: rawData,
          });

          if (contactRes.data) {
            contactId = contactRes.data.id;
            await this.contactService.recordEvent({
              userId: "00000000-0000-0000-0000-000000000001",
              organizationId: params.organizationId,
              contactId,
              eventType: "form_submission",
              funnelId: params.funnelId,
              pageId: params.pageId || form.page_id || undefined,
              metadata: { form_id: form.id, form_name: form.name, submission: rawData },
            });
          }
        }

        const { data: submission, error: subErr } = await (supabase.from("form_submissions") as any)
          .insert({
            organization_id: params.organizationId,
            form_id: params.formId,
            contact_id: contactId,
            submission_data: rawData,
          })
          .select()
          .single();

        if (subErr || !submission) return { data: null, error: subErr?.message || "Failed to submit form." };

        await (supabase.from("analytics_events") as any).insert({
          organization_id: params.organizationId,
          event_type: "form_submission",
          funnel_id: params.funnelId || null,
          page_id: params.pageId || form.page_id || null,
          contact_id: contactId,
          metadata: { form_id: form.id, submission_id: submission.id },
        });

        return { data: { submission: submission as FormSubmissionRow, contactId, submitAction }, error: null };
      }

      const form = this.store.forms.get(params.formId);
      if (!form || form.organization_id !== params.organizationId) {
        return { data: null, error: "Form not found." };
      }

      const rawData = params.submissionData || {};
      const emailValue = (rawData.email as string)?.trim().toLowerCase();

      let contactId: string | null = null;
      const submitAction = (form.submit_action as FormSubmitAction) || {};

      // 1. If email is provided, create or find contact and apply tags
      if (emailValue) {
        // Resolve first and last name if provided in submission data
        const firstName = (rawData.firstName || rawData.first_name || rawData.name) as string | undefined;
        const lastName = (rawData.lastName || rawData.last_name) as string | undefined;
        const phone = (rawData.phone || rawData.tel) as string | undefined;

        // Use organization owner or default ID for automated contact creation
        const orgMembers = Array.from(this.store.organizationMembers.values()).filter(
          (m) => m.organization_id === params.organizationId
        );
        const systemUserId = orgMembers[0]?.user_id || "00000000-0000-0000-0000-000000000001";

        const contactRes = await this.contactService.findOrCreateContact({
          userId: systemUserId,
          organizationId: params.organizationId,
          email: emailValue,
          firstName,
          lastName,
          phone,
          source: `Form: ${form.name}`,
          tags: submitAction.add_tags || [],
          customFields: rawData,
        });

        if (contactRes.data) {
          contactId = contactRes.data.id;

          // 2. Record journey event on contact
          await this.contactService.recordEvent({
            userId: systemUserId,
            organizationId: params.organizationId,
            contactId,
            eventType: "form_submission",
            funnelId: params.funnelId,
            pageId: params.pageId || form.page_id || undefined,
            metadata: {
              form_id: form.id,
              form_name: form.name,
              submission: rawData,
            },
          });
        }
      }

      // 3. Persist form submission record
      const submission = this.store.submitForm({
        organization_id: params.organizationId,
        form_id: params.formId,
        contact_id: contactId,
        submission_data: rawData,
      });

      // 4. Record global analytics event
      this.store.recordAnalyticsEvent({
        organization_id: params.organizationId,
        event_type: "form_submission",
        funnel_id: params.funnelId || null,
        page_id: params.pageId || form.page_id || null,
        contact_id: contactId,
        metadata: {
          form_id: form.id,
          submission_id: submission.id,
        },
      });

      return {
        data: {
          submission,
          contactId,
          submitAction,
        },
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getSubmissions(
    userId: string,
    organizationId: string,
    formId: string
  ): Promise<ServiceResult<FormSubmissionRow[]>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("form_submissions") as any)
          .select("*")
          .eq("form_id", formId)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (error) return { data: null, error: error.message };
        return { data: (data as FormSubmissionRow[]) || [], error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const submissions = this.store.queryFormSubmissionsWithRLS(userId, organizationId, formId);
      return { data: submissions, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }
}
