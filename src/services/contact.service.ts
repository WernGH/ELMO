/**
 * ELMO Phase 1 — Contact Service
 * Authoritative business service for Contacts, Tags, Contact-Tag associations, and Contact Journey Events.
 */import {
  MockDataStore,
  ContactRow,
  TagRow,
  ContactEventRow,
} from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ContactStatus } from "@/types/database.types";
import { ServiceResult } from "./funnel.service";

export interface CreateContactParams {
  userId: string;
  organizationId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: ContactStatus;
  source?: string;
  customFields?: Record<string, unknown>;
  tags?: string[]; // Tag names or IDs to automatically associate
}

export interface UpdateContactParams {
  userId: string;
  organizationId: string;
  contactId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: ContactStatus;
  source?: string;
  customFields?: Record<string, unknown>;
}

export interface RecordContactEventParams {
  userId: string;
  organizationId: string;
  contactId: string;
  eventType: string;
  funnelId?: string;
  pageId?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactWithTags extends ContactRow {
  tags: TagRow[];
}

export class ContactService {
  private static instance: ContactService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): ContactService {
    if (!ContactService.instance) {
      ContactService.instance = new ContactService();
    }
    return ContactService.instance;
  }

  public async getContacts(
    userId: string,
    organizationId: string
  ): Promise<ServiceResult<ContactWithTags[]>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("contacts") as any)
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (error) return { data: null, error: error.message };
        const withTags = ((data || []) as ContactRow[]).map((c) => ({ ...c, tags: [] }));
        return { data: withTags, error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const rawContacts = this.store.queryContactsWithRLS(userId, organizationId);
      const withTags: ContactWithTags[] = rawContacts.map((c) => ({
        ...c,
        tags: this.store.getContactTagsWithRLS(userId, organizationId, c.id),
      }));
      return { data: withTags, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getContactById(
    userId: string,
    organizationId: string,
    contactId: string
  ): Promise<ServiceResult<ContactWithTags>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("contacts") as any)
          .select("*")
          .eq("id", contactId)
          .eq("organization_id", organizationId)
          .single();

        if (error || !data) return { data: null, error: error?.message || "Contact not found." };
        return { data: { ...data, tags: [] }, error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const contact = this.store.getContactWithRLS(userId, organizationId, contactId);
      if (!contact) {
        return { data: null, error: "Contact not found." };
      }
      const tags = this.store.getContactTagsWithRLS(userId, organizationId, contactId);
      return { data: { ...contact, tags }, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async findOrCreateContact(params: CreateContactParams): Promise<ServiceResult<ContactWithTags>> {
    try {
      const cleanEmail = params.email?.toLowerCase().trim();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { data: null, error: "A valid email address is required." };
      }

      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data: existing } = await (supabase.from("contacts") as any)
          .select("*")
          .eq("organization_id", params.organizationId)
          .eq("email", cleanEmail)
          .maybeSingle();

        let contactRow: ContactRow;
        if (existing) {
          const updates: Partial<ContactRow> = {};
          if (params.firstName && !existing.first_name) updates.first_name = params.firstName;
          if (params.lastName && !existing.last_name) updates.last_name = params.lastName;
          if (params.phone && !existing.phone) updates.phone = params.phone;
          if (params.customFields) {
            updates.custom_fields = {
              ...(existing.custom_fields as Record<string, unknown>),
              ...params.customFields,
            };
          }
          if (Object.keys(updates).length > 0) {
            const { data: updated } = await (supabase.from("contacts") as any)
              .update(updates)
              .eq("id", existing.id)
              .select()
              .single();
            contactRow = updated || existing;
          } else {
            contactRow = existing;
          }
        } else {
          const { data: created, error: createErr } = await (supabase.from("contacts") as any)
            .insert({
              organization_id: params.organizationId,
              first_name: params.firstName || null,
              last_name: params.lastName || null,
              email: cleanEmail,
              phone: params.phone || null,
              status: params.status || "lead",
              source: params.source || "organic",
              custom_fields: params.customFields || {},
            })
            .select()
            .single();

          if (createErr || !created) {
            return { data: null, error: createErr?.message || "Failed to create contact." };
          }
          contactRow = created;
        }

        return { data: { ...contactRow, tags: [] }, error: null };
      }

      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      // Check if contact already exists in this organization
      const existing = this.store
        .queryContactsWithRLS(params.userId, params.organizationId)
        .find((c) => c.email === cleanEmail);

      let contactRow: ContactRow;
      if (existing) {
        // Update contact with any newly provided details
        const updates: Partial<ContactRow> = {};
        if (params.firstName && !existing.first_name) updates.first_name = params.firstName;
        if (params.lastName && !existing.last_name) updates.last_name = params.lastName;
        if (params.phone && !existing.phone) updates.phone = params.phone;
        if (params.customFields) {
          updates.custom_fields = {
            ...(existing.custom_fields as Record<string, unknown>),
            ...params.customFields,
          };
        }
        contactRow = this.store.updateContact(params.userId, params.organizationId, existing.id, updates) || existing;
      } else {
        contactRow = this.store.createContact({
          organization_id: params.organizationId,
          first_name: params.firstName || null,
          last_name: params.lastName || null,
          email: cleanEmail,
          phone: params.phone || null,
          status: params.status || "lead",
          source: params.source || "organic",
          custom_fields: params.customFields || {},
        });
      }

      // Handle tags association if provided
      if (params.tags && params.tags.length > 0) {
        for (const tagIdentifier of params.tags) {
          let tag = this.store
            .queryTagsWithRLS(params.userId, params.organizationId)
            .find((t) => t.id === tagIdentifier || t.name.toLowerCase() === tagIdentifier.toLowerCase());

          if (!tag) {
            tag = this.store.createTag({
              organization_id: params.organizationId,
              name: tagIdentifier,
            });
          }
          this.store.addTagToContact(params.userId, params.organizationId, contactRow.id, tag.id);
        }
      }

      const tags = this.store.getContactTagsWithRLS(params.userId, params.organizationId, contactRow.id);
      return { data: { ...contactRow, tags }, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async updateContact(params: UpdateContactParams): Promise<ServiceResult<ContactWithTags>> {
    try {
      const updates: Partial<ContactRow> = {};
      if (params.email) updates.email = params.email.toLowerCase().trim();
      if (params.firstName !== undefined) updates.first_name = params.firstName;
      if (params.lastName !== undefined) updates.last_name = params.lastName;
      if (params.phone !== undefined) updates.phone = params.phone;
      if (params.status !== undefined) updates.status = params.status;
      if (params.source !== undefined) updates.source = params.source;
      if (params.customFields !== undefined) updates.custom_fields = params.customFields;

      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("contacts") as any)
          .update(updates)
          .eq("id", params.contactId)
          .eq("organization_id", params.organizationId)
          .select()
          .single();

        if (error || !data) return { data: null, error: error?.message || "Failed to update contact." };
        return { data: { ...data, tags: [] }, error: null };
      }

      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const existing = this.store.getContactWithRLS(params.userId, params.organizationId, params.contactId);
      if (!existing) {
        return { data: null, error: "Contact not found or access denied." };
      }

      const updated = this.store.updateContact(params.userId, params.organizationId, params.contactId, updates);
      if (!updated) {
        return { data: null, error: "Failed to update contact." };
      }
      const tags = this.store.getContactTagsWithRLS(params.userId, params.organizationId, updated.id);
      return { data: { ...updated, tags }, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async deleteContact(
    userId: string,
    organizationId: string,
    contactId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { error } = await (supabase.from("contacts") as any)
          .delete()
          .eq("id", contactId)
          .eq("organization_id", organizationId);

        if (error) return { data: false, error: error.message };
        return { data: true, error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const success = this.store.deleteContact(userId, organizationId, contactId);
      if (!success) {
        return { data: null, error: "Contact not found or could not be deleted." };
      }
      return { data: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  // Tags
  public async getTags(userId: string, organizationId: string): Promise<ServiceResult<TagRow[]>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const tags = this.store.queryTagsWithRLS(userId, organizationId);
      return { data: tags, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createTag(
    userId: string,
    organizationId: string,
    name: string,
    description?: string
  ): Promise<ServiceResult<TagRow>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const cleanName = name?.trim();
      if (!cleanName) {
        return { data: null, error: "Tag name is required." };
      }
      const existing = this.store
        .queryTagsWithRLS(userId, organizationId)
        .find((t) => t.name.toLowerCase() === cleanName.toLowerCase());

      if (existing) {
        return { data: existing, error: null };
      }

      const created = this.store.createTag({
        organization_id: organizationId,
        name: cleanName,
        description: description || null,
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async addTagToContact(
    userId: string,
    organizationId: string,
    contactId: string,
    tagId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const success = this.store.addTagToContact(userId, organizationId, contactId, tagId);
      if (!success) {
        return { data: null, error: "Failed to add tag to contact." };
      }
      return { data: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async removeTagFromContact(
    userId: string,
    organizationId: string,
    contactId: string,
    tagId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const success = this.store.removeTagFromContact(userId, organizationId, contactId, tagId);
      return { data: success, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  // Contact Events
  public async recordEvent(params: RecordContactEventParams): Promise<ServiceResult<ContactEventRow>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("contact_events") as any)
          .insert({
            organization_id: params.organizationId,
            contact_id: params.contactId,
            event_type: params.eventType,
            funnel_id: params.funnelId || null,
            page_id: params.pageId || null,
            metadata: params.metadata || {},
          })
          .select()
          .single();

        if (error || !data) return { data: null, error: error?.message || "Failed to record event." };
        return { data: data as ContactEventRow, error: null };
      }

      const created = this.store.recordContactEvent({
        organization_id: params.organizationId,
        contact_id: params.contactId,
        event_type: params.eventType,
        funnel_id: params.funnelId || null,
        page_id: params.pageId || null,
        metadata: params.metadata || {},
      });
      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getContactEvents(
    userId: string,
    organizationId: string,
    contactId: string
  ): Promise<ServiceResult<ContactEventRow[]>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("contact_events") as any)
          .select("*")
          .eq("organization_id", organizationId)
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false });

        if (error) return { data: null, error: error.message };
        return { data: (data as ContactEventRow[]) || [], error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const events = this.store.queryContactEventsWithRLS(userId, organizationId, contactId);
      return { data: events, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }
}
