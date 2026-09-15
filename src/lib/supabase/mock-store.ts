import { Database, OrganizationRole, FunnelBusinessContext } from "@/types/database.types";
import { Organization, OrganizationMember, Profile } from "@/types/organization.types";
import { Conversation, Message, MessageMetadata } from "@/types/chat.types";
import { VoiceSessionData } from "@/services/voice/voice.types";

export interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
}

export type FunnelRow = Database["public"]["Tables"]["funnels"]["Row"];
export type FunnelInsert = Database["public"]["Tables"]["funnels"]["Insert"];
export type FunnelStepRow = Database["public"]["Tables"]["funnel_steps"]["Row"];
export type FunnelStepInsert = Database["public"]["Tables"]["funnel_steps"]["Insert"];
export type PageRow = Database["public"]["Tables"]["pages"]["Row"];
export type PageInsert = Database["public"]["Tables"]["pages"]["Insert"];
export type PageSectionRow = Database["public"]["Tables"]["page_sections"]["Row"];
export type PageSectionInsert = Database["public"]["Tables"]["page_sections"]["Insert"];
export type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
export type ContactTagRow = Database["public"]["Tables"]["contact_tags"]["Row"];
export type ContactEventRow = Database["public"]["Tables"]["contact_events"]["Row"];
export type ContactEventInsert = Database["public"]["Tables"]["contact_events"]["Insert"];
export type FormRow = Database["public"]["Tables"]["forms"]["Row"];
export type FormInsert = Database["public"]["Tables"]["forms"]["Insert"];
export type FormSubmissionRow = Database["public"]["Tables"]["form_submissions"]["Row"];
export type FormSubmissionInsert = Database["public"]["Tables"]["form_submissions"]["Insert"];
export type EmailTemplateRow = Database["public"]["Tables"]["email_templates"]["Row"];
export type EmailTemplateInsert = Database["public"]["Tables"]["email_templates"]["Insert"];
export type EmailSequenceRow = Database["public"]["Tables"]["email_sequences"]["Row"];
export type EmailSequenceInsert = Database["public"]["Tables"]["email_sequences"]["Insert"];
export type EmailSequenceStepRow = Database["public"]["Tables"]["email_sequence_steps"]["Row"];
export type EmailSequenceStepInsert = Database["public"]["Tables"]["email_sequence_steps"]["Insert"];
export type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
export type AutomationInsert = Database["public"]["Tables"]["automations"]["Insert"];
export type AutomationTriggerRow = Database["public"]["Tables"]["automation_triggers"]["Row"];
export type AutomationTriggerInsert = Database["public"]["Tables"]["automation_triggers"]["Insert"];
export type AutomationConditionRow = Database["public"]["Tables"]["automation_conditions"]["Row"];
export type AutomationConditionInsert = Database["public"]["Tables"]["automation_conditions"]["Insert"];
export type AutomationActionRow = Database["public"]["Tables"]["automation_actions"]["Row"];
export type AutomationActionInsert = Database["public"]["Tables"]["automation_actions"]["Insert"];
export type AnalyticsEventRow = Database["public"]["Tables"]["analytics_events"]["Row"];
export type AnalyticsEventInsert = Database["public"]["Tables"]["analytics_events"]["Insert"];
export type CompanyMemoryRow = Database["public"]["Tables"]["company_memories"]["Row"];
export type CompanyMemoryInsert = Database["public"]["Tables"]["company_memories"]["Insert"];

export class MockDataStore {
  private static instance: MockDataStore;

  public users: Map<string, MockUser> = new Map();
  public profiles: Map<string, Profile> = new Map();
  public organizations: Map<string, Organization> = new Map();
  public organizationMembers: Map<string, OrganizationMember> = new Map();
  public conversations: Map<string, Conversation> = new Map();
  public messages: Map<string, Message> = new Map();
  public voiceSessions: Map<string, VoiceSessionData> = new Map();

  // SaaS & Funnel Foundation Maps
  public funnels: Map<string, FunnelRow> = new Map();
  public funnelSteps: Map<string, FunnelStepRow> = new Map();
  public pages: Map<string, PageRow> = new Map();
  public pageSections: Map<string, PageSectionRow> = new Map();
  public contacts: Map<string, ContactRow> = new Map();
  public tags: Map<string, TagRow> = new Map();
  public contactTags: Map<string, ContactTagRow> = new Map(); // key: `${contact_id}:${tag_id}`
  public contactEvents: Map<string, ContactEventRow> = new Map();
  public forms: Map<string, FormRow> = new Map();
  public formSubmissions: Map<string, FormSubmissionRow> = new Map();
  public emailTemplates: Map<string, EmailTemplateRow> = new Map();
  public emailSequences: Map<string, EmailSequenceRow> = new Map();
  public emailSequenceSteps: Map<string, EmailSequenceStepRow> = new Map();
  public automations: Map<string, AutomationRow> = new Map();
  public automationTriggers: Map<string, AutomationTriggerRow> = new Map();
  public automationConditions: Map<string, AutomationConditionRow> = new Map();
  public automationActions: Map<string, AutomationActionRow> = new Map();
  public analyticsEvents: Map<string, AnalyticsEventRow> = new Map();
  public memories: Map<string, CompanyMemoryRow> = new Map();

  private constructor() {
    this.seedDefaultData();
  }

  public static getInstance(): MockDataStore {
    if (!MockDataStore.instance) {
      MockDataStore.instance = new MockDataStore();
    }
    return MockDataStore.instance;
  }

  public reset(): void {
    this.users.clear();
    this.profiles.clear();
    this.organizations.clear();
    this.organizationMembers.clear();
    this.conversations.clear();
    this.messages.clear();
    this.voiceSessions.clear();

    this.funnels.clear();
    this.funnelSteps.clear();
    this.pages.clear();
    this.pageSections.clear();
    this.contacts.clear();
    this.tags.clear();
    this.contactTags.clear();
    this.contactEvents.clear();
    this.forms.clear();
    this.formSubmissions.clear();
    this.emailTemplates.clear();
    this.emailSequences.clear();
    this.emailSequenceSteps.clear();
    this.automations.clear();
    this.automationTriggers.clear();
    this.automationConditions.clear();
    this.automationActions.clear();
    this.analyticsEvents.clear();
    this.memories.clear();

    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed default executive user
    const defaultUserId = "00000000-0000-0000-0000-000000000001";
    const defaultOrgId = "11111111-1111-1111-1111-111111111111";

    this.users.set(defaultUserId, {
      id: defaultUserId,
      email: "founder@elmo-ai.com",
      passwordHash: "password123",
    });

    this.profiles.set(defaultUserId, {
      id: defaultUserId,
      user_id: defaultUserId,
      display_name: "Executive Superior",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.organizations.set(defaultOrgId, {
      id: defaultOrgId,
      name: "ELMO Holdings",
      slug: "elmo-holdings",
      settings: {
        autonomy_mode: "supervised",
        elmo_status: "active",
        theme: "obsidian",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const memberId = "22222222-2222-2222-2222-222222222222";
    this.organizationMembers.set(memberId, {
      id: memberId,
      organization_id: defaultOrgId,
      user_id: defaultUserId,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    // Seed default executive conversation
    const defaultConvId = "33333333-3333-3333-3333-333333333333";
    this.conversations.set(defaultConvId, {
      id: defaultConvId,
      organization_id: defaultOrgId,
      title: "Executive Strategic Briefing",
      created_by: defaultUserId,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed initial introductory message from ELMO AI CEO
    const defaultMsgId = "44444444-4444-4444-4444-444444444444";
    this.messages.set(defaultMsgId, {
      id: defaultMsgId,
      conversation_id: defaultConvId,
      organization_id: defaultOrgId,
      role: "assistant",
      content: "Greetings, Superior. I am ELMO, the AI CEO of your autonomous workforce. I am standing by to receive your strategic directives, analyze organizational status, and prepare execution roadmaps. How may I serve our enterprise today?",
      metadata: {
        model: "gemini-1.5-flash",
        status: "complete",
      },
      created_at: new Date(Date.now() - 3600000).toISOString(),
    });
  }

  // --- RLS & Security Simulation Helpers ---

  public isOrgMember(userId: string, orgId: string): boolean {
    const members = Array.from(this.organizationMembers.values());
    for (const member of members) {
      if (member.organization_id === orgId && member.user_id === userId) {
        return true;
      }
    }
    return false;
  }

  public getOrgRole(userId: string, orgId: string): OrganizationRole | null {
    const members = Array.from(this.organizationMembers.values());
    for (const member of members) {
      if (member.organization_id === orgId && member.user_id === userId) {
        return member.role;
      }
    }
    return null;
  }

  public queryOrganizationsWithRLS(userId: string): Organization[] {
    const results: Organization[] = [];
    for (const org of this.organizations.values()) {
      if (this.isOrgMember(userId, org.id)) {
        results.push(org);
      }
    }
    return results;
  }

  public queryMembersWithRLS(userId: string, targetOrgId: string): OrganizationMember[] {
    if (!this.isOrgMember(userId, targetOrgId)) {
      return [];
    }
    const results: OrganizationMember[] = [];
    for (const member of this.organizationMembers.values()) {
      if (member.organization_id === targetOrgId) {
        results.push(member);
      }
    }
    return results;
  }

  public queryConversationsWithRLS(userId: string, targetOrgId: string): Conversation[] {
    if (!this.isOrgMember(userId, targetOrgId)) {
      return [];
    }
    const results: Conversation[] = [];
    for (const conv of this.conversations.values()) {
      if (conv.organization_id === targetOrgId) {
        results.push(conv);
      }
    }
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public queryMessagesWithRLS(userId: string, targetOrgId: string, conversationId: string): Message[] {
    if (!this.isOrgMember(userId, targetOrgId)) {
      return [];
    }
    const results: Message[] = [];
    for (const msg of this.messages.values()) {
      if (msg.organization_id === targetOrgId && msg.conversation_id === conversationId) {
        results.push(msg);
      }
    }
    return results.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public createConversation(
    data: Omit<Conversation, "id" | "created_at" | "updated_at"> & Partial<Conversation>
  ): Conversation {
    const id = data.id || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      organization_id: data.organization_id,
      title: data.title || "New Executive Session",
      created_by: data.created_by ?? null,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };
    this.conversations.set(id, conv);
    return conv;
  }

  public createMessage(
    data: Omit<Message, "id" | "created_at" | "metadata"> & {
      id?: string;
      metadata?: MessageMetadata;
      created_at?: string;
    }
  ): Message {
    const id = data.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const msg: Message = {
      id,
      conversation_id: data.conversation_id,
      organization_id: data.organization_id,
      role: data.role,
      content: data.content,
      metadata: data.metadata || {},
      created_at: data.created_at || new Date().toISOString(),
    };
    this.messages.set(id, msg);

    const conv = this.conversations.get(data.conversation_id);
    if (conv) {
      conv.updated_at = new Date().toISOString();
      this.conversations.set(conv.id, conv);
    }

    return msg;
  }

  public deleteConversation(userId: string, orgId: string, conversationId: string): boolean {
    if (!this.isOrgMember(userId, orgId)) {
      return false;
    }
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.organization_id !== orgId) {
      return false;
    }
    this.conversations.delete(conversationId);
    for (const [msgId, msg] of this.messages.entries()) {
      if (msg.conversation_id === conversationId) {
        this.messages.delete(msgId);
      }
    }
    return true;
  }

  public queryVoiceSessionsWithRLS(userId: string, targetOrgId: string): VoiceSessionData[] {
    if (!this.isOrgMember(userId, targetOrgId)) {
      return [];
    }
    const results: VoiceSessionData[] = [];
    for (const session of this.voiceSessions.values()) {
      if (session.organizationId === targetOrgId) {
        results.push({ ...session });
      }
    }
    return results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public upsertVoiceSession(session: VoiceSessionData): VoiceSessionData {
    this.voiceSessions.set(session.id, { ...session });
    return { ...session };
  }

  // ============================================================================
  // FUNNEL SAAS FOUNDATION RLS & CRUD METHODS
  // ============================================================================

  // 1. Funnels
  public queryFunnelsWithRLS(userId: string, targetOrgId: string): FunnelRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.funnels.values())
      .filter((f) => f.organization_id === targetOrgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getFunnelWithRLS(userId: string, targetOrgId: string, funnelId: string): FunnelRow | null {
    if (!this.isOrgMember(userId, targetOrgId)) return null;
    const f = this.funnels.get(funnelId);
    return f && f.organization_id === targetOrgId ? f : null;
  }

  public createFunnel(data: FunnelInsert): FunnelRow {
    const id = data.id || `fnl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: FunnelRow = {
      id,
      organization_id: data.organization_id,
      name: data.name,
      description: data.description ?? null,
      goal: data.goal ?? null,
      funnel_type: data.funnel_type ?? "Lead Generation",
      target_audience: data.target_audience ?? null,
      offer: data.offer ?? null,
      primary_conversion_goal: data.primary_conversion_goal ?? null,
      status: data.status ?? "draft",
      business_context: data.business_context ?? {},
      settings: data.settings ?? {},
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.funnels.set(id, row);
    return row;
  }

  public updateFunnel(
    userId: string,
    targetOrgId: string,
    funnelId: string,
    updates: Partial<FunnelRow>
  ): FunnelRow | null {
    const existing = this.getFunnelWithRLS(userId, targetOrgId, funnelId);
    if (!existing) return null;
    const updated: FunnelRow = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.funnels.set(funnelId, updated);
    return updated;
  }

  public deleteFunnel(userId: string, targetOrgId: string, funnelId: string): boolean {
    const existing = this.getFunnelWithRLS(userId, targetOrgId, funnelId);
    if (!existing) return false;
    this.funnels.delete(funnelId);
    // Cascade delete funnel steps & pages
    for (const [sId, step] of this.funnelSteps.entries()) {
      if (step.funnel_id === funnelId) this.funnelSteps.delete(sId);
    }
    for (const [pId, page] of this.pages.entries()) {
      if (page.funnel_id === funnelId) {
        this.pages.delete(pId);
        for (const [secId, sec] of this.pageSections.entries()) {
          if (sec.page_id === pId) this.pageSections.delete(secId);
        }
      }
    }
    return true;
  }

  // 2. Funnel Steps
  public queryFunnelStepsWithRLS(userId: string, targetOrgId: string, funnelId: string): FunnelStepRow[] {
    const funnel = this.getFunnelWithRLS(userId, targetOrgId, funnelId);
    if (!funnel) return [];
    return Array.from(this.funnelSteps.values())
      .filter((s) => s.funnel_id === funnelId)
      .sort((a, b) => a.step_order - b.step_order);
  }

  public createFunnelStep(data: FunnelStepInsert): FunnelStepRow {
    const id = data.id || `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: FunnelStepRow = {
      id,
      funnel_id: data.funnel_id,
      step_order: data.step_order ?? 1,
      step_type: data.step_type,
      name: data.name,
      page_id: data.page_id ?? null,
      goal: data.goal ?? null,
      settings: data.settings ?? {},
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.funnelSteps.set(id, row);
    return row;
  }

  public updateFunnelStep(
    userId: string,
    targetOrgId: string,
    stepId: string,
    updates: Partial<FunnelStepRow>
  ): FunnelStepRow | null {
    const step = this.funnelSteps.get(stepId);
    if (!step) return null;
    const funnel = this.getFunnelWithRLS(userId, targetOrgId, step.funnel_id);
    if (!funnel) return null;
    const updated: FunnelStepRow = {
      ...step,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.funnelSteps.set(stepId, updated);
    return updated;
  }

  public deleteFunnelStep(userId: string, targetOrgId: string, stepId: string): boolean {
    const step = this.funnelSteps.get(stepId);
    if (!step) return false;
    const funnel = this.getFunnelWithRLS(userId, targetOrgId, step.funnel_id);
    if (!funnel) return false;
    this.funnelSteps.delete(stepId);
    return true;
  }

  // 3. Pages
  public queryPagesWithRLS(userId: string, targetOrgId: string, funnelId?: string): PageRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.pages.values())
      .filter((p) => p.organization_id === targetOrgId && (!funnelId || p.funnel_id === funnelId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getPageWithRLS(userId: string, targetOrgId: string, pageId: string): PageRow | null {
    if (!this.isOrgMember(userId, targetOrgId)) return null;
    const page = this.pages.get(pageId);
    return page && page.organization_id === targetOrgId ? page : null;
  }

  public createPage(data: PageInsert): PageRow {
    const id = data.id || `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: PageRow = {
      id,
      organization_id: data.organization_id,
      funnel_id: data.funnel_id ?? null,
      name: data.name,
      slug: data.slug,
      page_type: data.page_type ?? "landing",
      status: data.status ?? "draft",
      title: data.title ?? null,
      settings: data.settings ?? {},
      metadata: data.metadata ?? {},
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.pages.set(id, row);
    return row;
  }

  public updatePage(
    userId: string,
    targetOrgId: string,
    pageId: string,
    updates: Partial<PageRow>
  ): PageRow | null {
    const existing = this.getPageWithRLS(userId, targetOrgId, pageId);
    if (!existing) return null;
    const updated: PageRow = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.pages.set(pageId, updated);
    return updated;
  }

  public deletePage(userId: string, targetOrgId: string, pageId: string): boolean {
    const existing = this.getPageWithRLS(userId, targetOrgId, pageId);
    if (!existing) return false;
    this.pages.delete(pageId);
    // Cascade delete sections
    for (const [secId, sec] of this.pageSections.entries()) {
      if (sec.page_id === pageId) this.pageSections.delete(secId);
    }
    return true;
  }

  // 4. Page Sections
  public queryPageSectionsWithRLS(userId: string, targetOrgId: string, pageId: string): PageSectionRow[] {
    const page = this.getPageWithRLS(userId, targetOrgId, pageId);
    if (!page) return [];
    return Array.from(this.pageSections.values())
      .filter((s) => s.page_id === pageId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  public createPageSection(data: PageSectionInsert): PageSectionRow {
    const id = data.id || `sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: PageSectionRow = {
      id,
      page_id: data.page_id,
      section_type: data.section_type,
      order_index: data.order_index ?? 1,
      content: data.content ?? {},
      layout: data.layout ?? {},
      styles: data.styles ?? {},
      settings: data.settings ?? {},
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.pageSections.set(id, row);
    return row;
  }

  public updatePageSection(
    userId: string,
    targetOrgId: string,
    sectionId: string,
    updates: Partial<PageSectionRow>
  ): PageSectionRow | null {
    const sec = this.pageSections.get(sectionId);
    if (!sec) return null;
    const page = this.getPageWithRLS(userId, targetOrgId, sec.page_id);
    if (!page) return null;
    const updated: PageSectionRow = {
      ...sec,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.pageSections.set(sectionId, updated);
    return updated;
  }

  public deletePageSection(userId: string, targetOrgId: string, sectionId: string): boolean {
    const sec = this.pageSections.get(sectionId);
    if (!sec) return false;
    const page = this.getPageWithRLS(userId, targetOrgId, sec.page_id);
    if (!page) return false;
    this.pageSections.delete(sectionId);
    return true;
  }

  // 5. Contacts
  public queryContactsWithRLS(userId: string, targetOrgId: string): ContactRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.contacts.values())
      .filter((c) => c.organization_id === targetOrgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getContactWithRLS(userId: string, targetOrgId: string, contactId: string): ContactRow | null {
    if (!this.isOrgMember(userId, targetOrgId)) return null;
    const contact = this.contacts.get(contactId);
    return contact && contact.organization_id === targetOrgId ? contact : null;
  }

  public createContact(data: ContactInsert): ContactRow {
    const id = data.id || `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: ContactRow = {
      id,
      organization_id: data.organization_id,
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      email: data.email.toLowerCase().trim(),
      phone: data.phone ?? null,
      status: data.status ?? "lead",
      source: data.source ?? null,
      custom_fields: data.custom_fields ?? {},
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.contacts.set(id, row);
    return row;
  }

  public updateContact(
    userId: string,
    targetOrgId: string,
    contactId: string,
    updates: Partial<ContactRow>
  ): ContactRow | null {
    const existing = this.getContactWithRLS(userId, targetOrgId, contactId);
    if (!existing) return null;
    const updated: ContactRow = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.contacts.set(contactId, updated);
    return updated;
  }

  public deleteContact(userId: string, targetOrgId: string, contactId: string): boolean {
    const existing = this.getContactWithRLS(userId, targetOrgId, contactId);
    if (!existing) return false;
    this.contacts.delete(contactId);
    // Cascade delete contact tags and events
    for (const [key, ct] of this.contactTags.entries()) {
      if (ct.contact_id === contactId) this.contactTags.delete(key);
    }
    for (const [eId, ev] of this.contactEvents.entries()) {
      if (ev.contact_id === contactId) this.contactEvents.delete(eId);
    }
    return true;
  }

  // 6. Tags & Contact Tags
  public queryTagsWithRLS(userId: string, targetOrgId: string): TagRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.tags.values())
      .filter((t) => t.organization_id === targetOrgId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public createTag(data: TagInsert): TagRow {
    const id = data.id || `tag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: TagRow = {
      id,
      organization_id: data.organization_id,
      name: data.name.trim(),
      description: data.description ?? null,
      created_at: data.created_at ?? now,
    };
    this.tags.set(id, row);
    return row;
  }

  public addTagToContact(userId: string, targetOrgId: string, contactId: string, tagId: string): boolean {
    const contact = this.getContactWithRLS(userId, targetOrgId, contactId);
    const tag = this.tags.get(tagId);
    if (!contact || !tag || tag.organization_id !== targetOrgId) return false;

    const key = `${contactId}:${tagId}`;
    this.contactTags.set(key, {
      contact_id: contactId,
      tag_id: tagId,
      created_at: new Date().toISOString(),
    });
    return true;
  }

  public removeTagFromContact(userId: string, targetOrgId: string, contactId: string, tagId: string): boolean {
    const contact = this.getContactWithRLS(userId, targetOrgId, contactId);
    if (!contact) return false;
    const key = `${contactId}:${tagId}`;
    return this.contactTags.delete(key);
  }

  public getContactTagsWithRLS(userId: string, targetOrgId: string, contactId: string): TagRow[] {
    const contact = this.getContactWithRLS(userId, targetOrgId, contactId);
    if (!contact) return [];
    const assignedTagIds = Array.from(this.contactTags.values())
      .filter((ct) => ct.contact_id === contactId)
      .map((ct) => ct.tag_id);

    return assignedTagIds
      .map((id) => this.tags.get(id))
      .filter((t): t is TagRow => !!t && t.organization_id === targetOrgId);
  }

  // 7. Contact Events
  public recordContactEvent(data: ContactEventInsert): ContactEventRow {
    const id = data.id || `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: ContactEventRow = {
      id,
      organization_id: data.organization_id,
      contact_id: data.contact_id,
      event_type: data.event_type,
      funnel_id: data.funnel_id ?? null,
      page_id: data.page_id ?? null,
      metadata: data.metadata ?? {},
      created_at: data.created_at ?? now,
    };
    this.contactEvents.set(id, row);
    return row;
  }

  public queryContactEventsWithRLS(userId: string, targetOrgId: string, contactId: string): ContactEventRow[] {
    const contact = this.getContactWithRLS(userId, targetOrgId, contactId);
    if (!contact) return [];
    return Array.from(this.contactEvents.values())
      .filter((e) => e.contact_id === contactId && e.organization_id === targetOrgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // 8. Forms & Submissions
  public queryFormsWithRLS(userId: string, targetOrgId: string, pageId?: string): FormRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.forms.values())
      .filter((f) => f.organization_id === targetOrgId && (!pageId || f.page_id === pageId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createForm(data: FormInsert): FormRow {
    const id = data.id || `form-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: FormRow = {
      id,
      organization_id: data.organization_id,
      page_id: data.page_id ?? null,
      name: data.name,
      fields: data.fields ?? [],
      settings: data.settings ?? {},
      submit_action: data.submit_action ?? {},
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.forms.set(id, row);
    return row;
  }

  public getFormWithRLS(userId: string, targetOrgId: string, formId: string): FormRow | null {
    if (!this.isOrgMember(userId, targetOrgId)) return null;
    const form = this.forms.get(formId);
    if (!form || form.organization_id !== targetOrgId) return null;
    return form;
  }

  public updateForm(
    userId: string,
    targetOrgId: string,
    formId: string,
    updates: Partial<FormRow>
  ): FormRow | null {
    const existing = this.getFormWithRLS(userId, targetOrgId, formId);
    if (!existing) return null;
    const updated: FormRow = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.forms.set(formId, updated);
    return updated;
  }

  public submitForm(data: FormSubmissionInsert): FormSubmissionRow {
    const id = data.id || `fsub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: FormSubmissionRow = {
      id,
      organization_id: data.organization_id,
      form_id: data.form_id,
      contact_id: data.contact_id ?? null,
      submission_data: data.submission_data ?? {},
      created_at: data.created_at ?? now,
    };
    this.formSubmissions.set(id, row);
    return row;
  }

  public queryFormSubmissionsWithRLS(userId: string, targetOrgId: string, formId: string): FormSubmissionRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.formSubmissions.values())
      .filter((s) => s.organization_id === targetOrgId && s.form_id === formId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // 9. Email Templates & Sequences
  public queryEmailTemplatesWithRLS(userId: string, targetOrgId: string): EmailTemplateRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.emailTemplates.values())
      .filter((t) => t.organization_id === targetOrgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createEmailTemplate(data: EmailTemplateInsert): EmailTemplateRow {
    const id = data.id || `etpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: EmailTemplateRow = {
      id,
      organization_id: data.organization_id,
      name: data.name,
      subject: data.subject,
      body: data.body,
      variables: data.variables ?? [],
      status: data.status ?? "draft",
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.emailTemplates.set(id, row);
    return row;
  }

  public updateEmailTemplate(
    templateId: string,
    data: Partial<Omit<EmailTemplateRow, "id" | "organization_id" | "created_at">>
  ): EmailTemplateRow {
    const existing = this.emailTemplates.get(templateId);
    if (!existing) throw new Error("Email template not found.");
    const updated: EmailTemplateRow = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.emailTemplates.set(templateId, updated);
    return updated;
  }

  public queryEmailSequencesWithRLS(userId: string, targetOrgId: string): EmailSequenceRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.emailSequences.values())
      .filter((s) => s.organization_id === targetOrgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createEmailSequence(data: EmailSequenceInsert): EmailSequenceRow {
    const id = data.id || `eseq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: EmailSequenceRow = {
      id,
      organization_id: data.organization_id,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? "draft",
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.emailSequences.set(id, row);
    return row;
  }

  public queryEmailSequenceStepsWithRLS(userId: string, targetOrgId: string, sequenceId: string): EmailSequenceStepRow[] {
    const seq = this.emailSequences.get(sequenceId);
    if (!seq || !this.isOrgMember(userId, targetOrgId) || seq.organization_id !== targetOrgId) return [];
    return Array.from(this.emailSequenceSteps.values())
      .filter((st) => st.sequence_id === sequenceId)
      .sort((a, b) => a.step_order - b.step_order);
  }

  public createEmailSequenceStep(data: EmailSequenceStepInsert): EmailSequenceStepRow {
    const id = data.id || `estep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: EmailSequenceStepRow = {
      id,
      sequence_id: data.sequence_id,
      step_order: data.step_order ?? 1,
      delay_value: data.delay_value ?? 0,
      delay_unit: data.delay_unit ?? "hours",
      subject: data.subject,
      body: data.body,
      template_id: data.template_id ?? null,
      status: data.status ?? "active",
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.emailSequenceSteps.set(id, row);
    return row;
  }

  // 10. Automations
  public queryAutomationsWithRLS(userId: string, targetOrgId: string): AutomationRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.automations.values())
      .filter((a) => a.organization_id === targetOrgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createAutomation(data: AutomationInsert): AutomationRow {
    const id = data.id || `auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: AutomationRow = {
      id,
      organization_id: data.organization_id,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? "draft",
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    this.automations.set(id, row);
    return row;
  }

  public createAutomationTrigger(data: AutomationTriggerInsert): AutomationTriggerRow {
    const id = data.id || `trig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row: AutomationTriggerRow = {
      id,
      automation_id: data.automation_id,
      trigger_type: data.trigger_type,
      config: data.config ?? {},
      created_at: data.created_at ?? new Date().toISOString(),
    };
    this.automationTriggers.set(id, row);
    return row;
  }

  public createAutomationCondition(data: AutomationConditionInsert): AutomationConditionRow {
    const id = data.id || `cond-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row: AutomationConditionRow = {
      id,
      automation_id: data.automation_id,
      condition_type: data.condition_type,
      config: data.config ?? {},
      step_order: data.step_order ?? 1,
      created_at: data.created_at ?? new Date().toISOString(),
    };
    this.automationConditions.set(id, row);
    return row;
  }

  public createAutomationAction(data: AutomationActionInsert): AutomationActionRow {
    const id = data.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row: AutomationActionRow = {
      id,
      automation_id: data.automation_id,
      action_type: data.action_type,
      config: data.config ?? {},
      step_order: data.step_order ?? 1,
      created_at: data.created_at ?? new Date().toISOString(),
    };
    this.automationActions.set(id, row);
    return row;
  }

  // 11. Analytics Events
  public recordAnalyticsEvent(data: AnalyticsEventInsert): AnalyticsEventRow {
    const id = data.id || `aev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: AnalyticsEventRow = {
      id,
      organization_id: data.organization_id,
      event_type: data.event_type,
      funnel_id: data.funnel_id ?? null,
      page_id: data.page_id ?? null,
      contact_id: data.contact_id ?? null,
      metadata: data.metadata ?? {},
      created_at: data.created_at ?? now,
    };
    this.analyticsEvents.set(id, row);
    return row;
  }

  public queryAnalyticsEventsWithRLS(
    userId: string,
    targetOrgId: string,
    filter?: { eventType?: string; funnelId?: string; pageId?: string }
  ): AnalyticsEventRow[] {
    if (!this.isOrgMember(userId, targetOrgId)) return [];
    return Array.from(this.analyticsEvents.values())
      .filter((e) => {
        if (e.organization_id !== targetOrgId) return false;
        if (filter?.eventType && e.event_type !== filter.eventType) return false;
        if (filter?.funnelId && e.funnel_id !== filter.funnelId) return false;
        if (filter?.pageId && e.page_id !== filter.pageId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Company Memories CRUD
  public queryMemoriesWithRLS(
    userId: string,
    organizationId: string,
    category?: string,
    limit = 20,
    options?: {
      status?: string | string[];
      scope?: string;
      entityType?: string;
      includeExpired?: boolean;
    }
  ): CompanyMemoryRow[] {
    if (!this.isOrgMember(userId, organizationId)) {
      return [];
    }
    const results: CompanyMemoryRow[] = [];
    const nowTime = Date.now();
    const targetStatuses = options?.status
      ? Array.isArray(options.status)
        ? options.status
        : [options.status]
      : ["active"];

    for (const mem of this.memories.values()) {
      if (mem.organization_id === organizationId) {
        // Status filter
        if (targetStatuses.length > 0 && !targetStatuses.includes(mem.status || "active")) {
          continue;
        }
        // Category filter
        if (category && mem.category !== category) {
          continue;
        }
        // Scope filter
        if (options?.scope && mem.scope !== options.scope) {
          continue;
        }
        // Entity type filter
        if (options?.entityType && mem.entity_type !== options.entityType) {
          continue;
        }
        // Expiration filter
        if (!options?.includeExpired && mem.valid_until) {
          const expTime = new Date(mem.valid_until).getTime();
          if (!isNaN(expTime) && expTime < nowTime) {
            continue;
          }
        }
        results.push(mem);
      }
    }
    return results
      .sort((a, b) => {
        if (b.importance_score !== a.importance_score) {
          return Number(b.importance_score) - Number(a.importance_score);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, limit);
  }

  public createMemory(data: CompanyMemoryInsert): CompanyMemoryRow {
    const id = data.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const row: CompanyMemoryRow = {
      id,
      organization_id: data.organization_id,
      user_id: data.user_id || null,
      scope: data.scope || "organization",
      category: data.category || "business",
      title: data.title || null,
      content: data.content,
      normalized_content: data.normalized_content || data.content.toLowerCase().trim(),
      metadata: data.metadata || {},
      importance_score: data.importance_score ?? 3,
      confidence: data.confidence ?? 0.9,
      confidence_level: data.confidence_level || (data.confidence && data.confidence >= 0.95 ? "confirmed" : data.confidence && data.confidence >= 0.8 ? "high" : "medium"),
      status: data.status || "active",
      source: data.source || "conversation",
      source_reference: data.source_reference || null,
      entity_type: data.entity_type || "business",
      entity_id: data.entity_id || null,
      valid_from: data.valid_from || now,
      valid_until: data.valid_until || null,
      superseded_by: data.superseded_by || null,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
      last_accessed_at: data.last_accessed_at || now,
    };
    this.memories.set(id, row);
    return row;
  }

  public updateMemory(
    userId: string,
    organizationId: string,
    memoryId: string,
    updates: Partial<CompanyMemoryRow>
  ): CompanyMemoryRow | null {
    if (!this.isOrgMember(userId, organizationId)) return null;
    const existing = this.memories.get(memoryId);
    if (!existing || existing.organization_id !== organizationId) return null;
    const updated: CompanyMemoryRow = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    };
    this.memories.set(memoryId, updated);
    return updated;
  }

  public supersedeMemory(
    userId: string,
    organizationId: string,
    oldMemoryId: string,
    newMemoryData: CompanyMemoryInsert
  ): { oldMemory: CompanyMemoryRow; newMemory: CompanyMemoryRow } | null {
    if (!this.isOrgMember(userId, organizationId)) return null;
    const oldMemory = this.memories.get(oldMemoryId);
    if (!oldMemory || oldMemory.organization_id !== organizationId) return null;

    // Create the newer active memory
    const newMemory = this.createMemory({
      ...newMemoryData,
      organization_id: organizationId,
      status: "active",
    });

    // Mark old memory as superseded and link to new memory
    const supersededOld: CompanyMemoryRow = {
      ...oldMemory,
      status: "superseded",
      superseded_by: newMemory.id,
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    };
    this.memories.set(oldMemoryId, supersededOld);

    return { oldMemory: supersededOld, newMemory };
  }

  public deleteMemory(userId: string, organizationId: string, memoryId: string): boolean {
    if (!this.isOrgMember(userId, organizationId)) return false;
    const existing = this.memories.get(memoryId);
    if (!existing || existing.organization_id !== organizationId) return false;
    return this.memories.delete(memoryId);
  }
}

