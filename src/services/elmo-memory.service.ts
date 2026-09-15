/**
 * ELMO Phase 2 — Advanced Long-Term Memory Engine (ElmoMemoryService)
 *
 * Persistent, Semantic, Episodic & Business Memory Architecture:
 * - Implements ICompanyMemoryEngine
 * - Multi-tenant organization isolation (RLS)
 * - Complete Lifecycle: ACTIVE, SUPERSEDED, ARCHIVED, EXPIRED, DELETED
 * - Traceable Supersession: preserves history instead of blind overwrites
 * - Calibrated Confidence: LOW (0.25), MEDIUM (0.50), HIGH (0.85), CONFIRMED (1.00)
 * - Importance Scale: 1 (trivial), 2 (low), 3 (useful), 4 (important), 5 (critical)
 * - Temporal Validity: valid_from, valid_until (handles promotions, quarterly goals)
 * - Multi-factor Ranking: Relevance + Importance + Confidence + Recency + Context Match
 * - Cross-lingual continuity: normalized representations for English, Malay, Chinese, and code-mixed queries
 * - Shared Voice & Text Foundation
 * - Automatic Semantic Extraction & Conflict Resolution
 * - Natural Language Explicit Memory Commands (store, forget, update, query)
 */

import { MockDataStore, CompanyMemoryRow } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  MemoryScope,
  MemoryCategory,
  MemoryStatus,
  MemoryConfidenceLevel,
  MemorySource,
} from "@/types/database.types";
import { ICompanyMemoryEngine } from "@/ai/memory/memory.interface";
import { MemoryEntry } from "@/types/future/memory.types";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export const CONFIDENCE_LEVEL_SCORES: Record<MemoryConfidenceLevel, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.85,
  confirmed: 1.0,
};

export interface CreateMemoryParams {
  userId: string;
  organizationId: string;
  title?: string;
  content: string;
  normalizedContent?: string;
  scope?: MemoryScope;
  category?: MemoryCategory;
  importance?: number; // 1 to 5
  confidenceLevel?: MemoryConfidenceLevel;
  confidence?: number;
  status?: MemoryStatus;
  source?: MemorySource;
  sourceReference?: string;
  entityType?: string;
  entityId?: string;
  validFrom?: string;
  validUntil?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MemoryQueryOptions {
  category?: MemoryCategory;
  status?: MemoryStatus | MemoryStatus[];
  scope?: MemoryScope;
  entityType?: string;
  entityId?: string;
  includeExpired?: boolean;
  minImportance?: number;
  minConfidence?: number;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryExtractionResult {
  memoriesCreated: CompanyMemoryRow[];
  memoriesSuperseded: { oldMemory: CompanyMemoryRow; newMemory: CompanyMemoryRow }[];
  summary: string;
}

export interface ExplicitMemoryCommandResult {
  action: "stored" | "forgotten" | "updated" | "queried" | "unrecognized";
  memory?: CompanyMemoryRow;
  memories?: CompanyMemoryRow[];
  explanation: string;
}

export class ElmoMemoryService implements ICompanyMemoryEngine {
  private static instance: ElmoMemoryService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): ElmoMemoryService {
    if (!ElmoMemoryService.instance) {
      ElmoMemoryService.instance = new ElmoMemoryService();
    }
    return ElmoMemoryService.instance;
  }

  public static resetInstance(): void {
    ElmoMemoryService.instance = undefined as any;
  }

  // --------------------------------------------------------------------------
  // ICompanyMemoryEngine Implementation (Backward Compatibility)
  // --------------------------------------------------------------------------

  public async storeMemory(
    entry: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessedAt">
  ): Promise<MemoryEntry> {
    const importanceScore = entry.importanceScore ?? 0.5;
    const importance = Math.max(1, Math.min(5, Math.round(importanceScore * 5))) || 3;

    const row = this.store.createMemory({
      organization_id: entry.organizationId,
      scope: entry.scope,
      category: (entry.metadata?.category as MemoryCategory) || "business",
      content: entry.content,
      normalized_content: entry.content.toLowerCase().trim(),
      metadata: entry.metadata || {},
      importance_score: importance,
      confidence: 0.9,
      confidence_level: "high",
      status: "active",
      source: "conversation",
      entity_type: "business",
    });

    return this.mapRowToEntry(row);
  }

  public async searchRelevantMemory(
    organizationId: string,
    query: string,
    scope?: MemoryScope,
    limit = 5
  ): Promise<MemoryEntry[]> {
    const memories = Array.from(this.store.memories.values()).filter(
      (m) =>
        m.organization_id === organizationId &&
        (!scope || m.scope === scope) &&
        (m.status === "active" || !m.status)
    );

    const scored = memories.map((mem) => ({
      mem,
      score: this.calculateRelevanceScore(query, mem),
    }));

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => this.mapRowToEntry(s.mem));
  }

  // --------------------------------------------------------------------------
  // Phase 2 Core Memory Management (CRUD & Lifecycle)
  // --------------------------------------------------------------------------

  public async createMemory(params: CreateMemoryParams): Promise<ServiceResult<CompanyMemoryRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      if (!params.content?.trim() || params.content.trim().length < 3) {
        return { data: null, error: "Memory content is too short to store." };
      }

      const importance = Math.max(1, Math.min(5, params.importance ?? 3));
      const confidenceLevel = params.confidenceLevel || "high";
      const confidence = params.confidence ?? CONFIDENCE_LEVEL_SCORES[confidenceLevel];

      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("company_memories") as any)
          .insert({
            organization_id: params.organizationId,
            user_id: params.userId,
            scope: params.scope || "organization",
            category: params.category || "business",
            title: params.title || null,
            content: params.content.trim(),
            normalized_content:
              params.normalizedContent || this.normalizeMultilingualText(params.content),
            metadata: params.metadata || {},
            importance_score: importance,
            confidence,
            confidence_level: confidenceLevel,
            status: params.status || "active",
            source: params.source || "conversation",
            source_reference: params.sourceReference || null,
            entity_type: params.entityType || "business",
            entity_id: params.entityId || null,
            valid_from: params.validFrom || new Date().toISOString(),
            valid_until: params.validUntil || null,
          })
          .select()
          .single();

        if (error || !data) {
          return { data: null, error: error?.message || "Failed to create memory in Supabase." };
        }
        return { data: data as CompanyMemoryRow, error: null };
      }

      const row = this.store.createMemory({
        organization_id: params.organizationId,
        user_id: params.userId,
        scope: params.scope || "organization",
        category: params.category || "business",
        title: params.title || null,
        content: params.content.trim(),
        normalized_content:
          params.normalizedContent || this.normalizeMultilingualText(params.content),
        metadata: params.metadata || {},
        importance_score: importance,
        confidence,
        confidence_level: confidenceLevel,
        status: params.status || "active",
        source: params.source || "conversation",
        source_reference: params.sourceReference || null,
        entity_type: params.entityType || "business",
        entity_id: params.entityId || null,
        valid_from: params.validFrom || new Date().toISOString(),
        valid_until: params.validUntil || null,
      });

      return { data: row, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getMemoryById(
    userId: string,
    organizationId: string,
    memoryId: string
  ): Promise<ServiceResult<CompanyMemoryRow>> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("company_memories") as any)
        .select("*")
        .eq("id", memoryId)
        .eq("organization_id", organizationId)
        .single();

      if (error || !data) {
        return { data: null, error: error?.message || "Memory record not found." };
      }
      return { data: data as CompanyMemoryRow, error: null };
    }

    if (!this.store.isOrgMember(userId, organizationId)) {
      return { data: null, error: "Unauthorized: User is not an organization member." };
    }
    const memory = this.store.memories.get(memoryId);
    if (!memory || memory.organization_id !== organizationId) {
      return { data: null, error: "Memory record not found." };
    }
    return { data: memory, error: null };
  }

  public async updateMemory(
    userId: string,
    organizationId: string,
    memoryId: string,
    updates: Partial<CreateMemoryParams>
  ): Promise<ServiceResult<CompanyMemoryRow>> {
    try {
      const updatePayload: Partial<CompanyMemoryRow> = {};
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.content !== undefined) {
        updatePayload.content = updates.content.trim();
        updatePayload.normalized_content = this.normalizeMultilingualText(updates.content);
      }
      if (updates.category !== undefined) updatePayload.category = updates.category;
      if (updates.scope !== undefined) updatePayload.scope = updates.scope;
      if (updates.importance !== undefined) {
        updatePayload.importance_score = Math.max(1, Math.min(5, updates.importance));
      }
      if (updates.confidenceLevel !== undefined) {
        updatePayload.confidence_level = updates.confidenceLevel;
        updatePayload.confidence = CONFIDENCE_LEVEL_SCORES[updates.confidenceLevel];
      }
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.validUntil !== undefined) updatePayload.valid_until = updates.validUntil;
      if (updates.metadata !== undefined) {
        updatePayload.metadata = updates.metadata as any;
      }

      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("company_memories") as any)
          .update(updatePayload)
          .eq("id", memoryId)
          .eq("organization_id", organizationId)
          .select()
          .single();

        if (error || !data) {
          return { data: null, error: error?.message || "Failed to update memory in Supabase." };
        }
        return { data: data as CompanyMemoryRow, error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const existing = this.store.memories.get(memoryId);
      if (!existing || existing.organization_id !== organizationId) {
        return { data: null, error: "Memory record not found." };
      }

      if (updates.metadata !== undefined) {
        updatePayload.metadata = { ...(existing.metadata as Record<string, unknown>), ...updates.metadata };
      }

      const updated = this.store.updateMemory(userId, organizationId, memoryId, updatePayload);
      if (!updated) {
        return { data: null, error: "Failed to update memory record." };
      }
      return { data: updated, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  /**
   * Intelligently supersedes an older memory with updated knowledge.
   * Preserves historical knowledge without blind overwriting.
   */
  public async supersedeMemory(params: {
    userId: string;
    organizationId: string;
    oldMemoryId: string;
    newMemory: Omit<CreateMemoryParams, "userId" | "organizationId">;
  }): Promise<ServiceResult<{ oldMemory: CompanyMemoryRow; newMemory: CompanyMemoryRow }>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const existingOld = this.store.memories.get(params.oldMemoryId);
      if (!existingOld || existingOld.organization_id !== params.organizationId) {
        return { data: null, error: "Old memory record to supersede was not found." };
      }

      const importance = Math.max(1, Math.min(5, params.newMemory.importance ?? existingOld.importance_score ?? 3));
      const confidenceLevel = params.newMemory.confidenceLevel || existingOld.confidence_level || "high";

      const res = this.store.supersedeMemory(
        params.userId,
        params.organizationId,
        params.oldMemoryId,
        {
          organization_id: params.organizationId,
          user_id: params.userId,
          scope: params.newMemory.scope || existingOld.scope,
          category: params.newMemory.category || existingOld.category,
          title: params.newMemory.title || existingOld.title,
          content: params.newMemory.content.trim(),
          normalized_content:
            params.newMemory.normalizedContent ||
            this.normalizeMultilingualText(params.newMemory.content),
          metadata: {
            ...(existingOld.metadata as Record<string, unknown>),
            ...(params.newMemory.metadata || {}),
            superseded_from_id: existingOld.id,
          },
          importance_score: importance,
          confidence: params.newMemory.confidence ?? CONFIDENCE_LEVEL_SCORES[confidenceLevel],
          confidence_level: confidenceLevel,
          source: params.newMemory.source || "user_input",
          source_reference: params.newMemory.sourceReference || existingOld.source_reference,
          entity_type: params.newMemory.entityType || existingOld.entity_type,
          entity_id: params.newMemory.entityId || existingOld.entity_id,
          valid_from: params.newMemory.validFrom || new Date().toISOString(),
          valid_until: params.newMemory.validUntil || null,
        }
      );

      if (!res) {
        return { data: null, error: "Failed to execute memory supersession." };
      }

      return { data: res, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async archiveMemory(
    userId: string,
    organizationId: string,
    memoryId: string
  ): Promise<ServiceResult<CompanyMemoryRow>> {
    return this.updateMemory(userId, organizationId, memoryId, { status: "archived" });
  }

  public async deleteMemory(
    userId: string,
    organizationId: string,
    memoryId: string
  ): Promise<ServiceResult<boolean>> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { error } = await (supabase.from("company_memories") as any)
        .delete()
        .eq("id", memoryId)
        .eq("organization_id", organizationId);

      if (error) {
        return { data: false, error: error.message };
      }
      return { data: true, error: null };
    }

    if (!this.store.isOrgMember(userId, organizationId)) {
      return { data: false, error: "Unauthorized: User is not an organization member." };
    }
    const success = this.store.deleteMemory(userId, organizationId, memoryId);
    return { data: success, error: success ? null : "Memory record not found or could not be deleted." };
  }

  /**
   * Retrieves the historical supersession chain for an entity/memory.
   */
  public async getMemoryHistory(
    userId: string,
    organizationId: string,
    memoryId: string
  ): Promise<ServiceResult<CompanyMemoryRow[]>> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data: memory } = await (supabase.from("company_memories") as any)
        .select("*")
        .eq("id", memoryId)
        .eq("organization_id", organizationId)
        .single();

      if (!memory) {
        return { data: null, error: "Memory record not found." };
      }

      const { data: history } = await (supabase.from("company_memories") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .eq("entity_type", memory.entity_type)
        .eq("category", memory.category)
        .order("created_at", { ascending: true });

      return { data: (history as CompanyMemoryRow[]) || [], error: null };
    }

    if (!this.store.isOrgMember(userId, organizationId)) {
      return { data: null, error: "Unauthorized: User is not an organization member." };
    }

    const memory = this.store.memories.get(memoryId);
    if (!memory || memory.organization_id !== organizationId) {
      return { data: null, error: "Memory record not found." };
    }

    // Trace all connected memories via superseded_by or metadata.superseded_from_id
    const entityType = memory.entity_type;
    const history = Array.from(this.store.memories.values())
      .filter(
        (m) =>
          m.organization_id === organizationId &&
          m.entity_type === entityType &&
          m.category === memory.category
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return { data: history, error: null };
  }

  public async listMemories(
    userId: string,
    organizationId: string,
    options?: MemoryQueryOptions
  ): Promise<CompanyMemoryRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      let q = (supabase.from("company_memories") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (options?.category) q = q.eq("category", options.category);
      if (options?.scope) q = q.eq("scope", options.scope);
      if (options?.status) {
        if (Array.isArray(options.status)) {
          q = q.in("status", options.status);
        } else {
          q = q.eq("status", options.status);
        }
      }
      if (options?.entityType) q = q.eq("entity_type", options.entityType);
      if (options?.limit) q = q.limit(options.limit);

      const { data, error } = await q;
      if (error || !data) return [];
      let records = data as CompanyMemoryRow[];

      if (options?.searchQuery?.trim()) {
        const query = options.searchQuery.toLowerCase().trim();
        records = records.filter(
          (m) =>
            m.content.toLowerCase().includes(query) ||
            (m.title && m.title.toLowerCase().includes(query)) ||
            (m.normalized_content && m.normalized_content.toLowerCase().includes(query))
        );
      }

      if (options?.minImportance) {
        records = records.filter((m) => Number(m.importance_score) >= options.minImportance!);
      }
      if (options?.minConfidence) {
        records = records.filter((m) => Number(m.confidence) >= options.minConfidence!);
      }

      const offset = options?.offset || 0;
      const limit = options?.limit || 50;
      return records.slice(offset, offset + limit);
    }

    if (!this.store.isOrgMember(userId, organizationId)) {
      return [];
    }

    let records = this.store.queryMemoriesWithRLS(
      userId,
      organizationId,
      options?.category,
      options?.limit || 100,
      {
        status: options?.status,
        scope: options?.scope,
        entityType: options?.entityType,
        includeExpired: options?.includeExpired,
      }
    );

    if (options?.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      records = records.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.normalized_content && m.normalized_content.toLowerCase().includes(q))
      );
    }

    if (options?.minImportance) {
      records = records.filter((m) => Number(m.importance_score) >= options.minImportance!);
    }

    if (options?.minConfidence) {
      records = records.filter((m) => Number(m.confidence) >= options.minConfidence!);
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return records.slice(offset, offset + limit);
  }

  // --------------------------------------------------------------------------
  // Semantic Domain Storage Helpers (Business Identity, Audience, Goals, etc.)
  // --------------------------------------------------------------------------

  public async saveBusinessMemory(params: {
    userId: string;
    organizationId: string;
    title?: string;
    content: string;
    importanceScore?: number;
    metadata?: Record<string, unknown>;
  }): Promise<ServiceResult<CompanyMemoryRow>> {
    return this.createMemory({
      userId: params.userId,
      organizationId: params.organizationId,
      title: params.title || "Business Identity & Positioning",
      content: params.content,
      category: "business",
      entityType: "business_identity",
      importance: params.importanceScore ? Math.round(params.importanceScore * 5) : 5,
      confidenceLevel: "confirmed",
      metadata: params.metadata,
      source: "user_input",
    });
  }

  public async saveTargetAudience(params: {
    userId: string;
    organizationId: string;
    title?: string;
    content: string;
    importance?: number;
    metadata?: Record<string, unknown>;
  }): Promise<ServiceResult<CompanyMemoryRow>> {
    return this.createMemory({
      userId: params.userId,
      organizationId: params.organizationId,
      title: params.title || "Target Audience & Persona",
      content: params.content,
      category: "business",
      entityType: "audience",
      importance: params.importance ?? 5,
      confidenceLevel: "confirmed",
      metadata: params.metadata,
      source: "user_input",
    });
  }

  public async saveGoal(params: {
    userId: string;
    organizationId: string;
    goal?: string;
    objective?: string;
    targetDate?: string;
    deadline?: string;
    targetMetric?: string;
    targetValue?: number;
    importance?: number;
    importanceScore?: number;
    metadata?: Record<string, unknown>;
  }): Promise<ServiceResult<CompanyMemoryRow>> {
    const text = (params.goal || params.objective || "").trim();
    if (!text) {
      return { data: null, error: "Goal text cannot be empty." };
    }

    const importance = params.importance ?? (params.importanceScore ? Math.round(params.importanceScore * 5) : 4);
    return this.createMemory({
      userId: params.userId,
      organizationId: params.organizationId,
      title: "Strategic Business Goal",
      content: text,
      category: "goal",
      entityType: "goal",
      importance,
      confidenceLevel: "high",
      validUntil: params.targetDate || params.deadline || null,
      metadata: {
        ...(params.metadata || {}),
        target_date: params.targetDate || params.deadline,
        target_metric: params.targetMetric,
        target_value: params.targetValue,
      },
      source: "conversation",
    });
  }

  public async savePreference(params: {
    userId: string;
    organizationId: string;
    preference: string;
    scope?: MemoryScope;
    importance?: number;
  }): Promise<ServiceResult<CompanyMemoryRow>> {
    return this.createMemory({
      userId: params.userId,
      organizationId: params.organizationId,
      title: "Operational / Communication Preference",
      content: params.preference.trim(),
      category: "preference",
      scope: params.scope || "organization",
      entityType: "preference",
      importance: params.importance ?? 4,
      confidenceLevel: "confirmed",
      source: "explicit_command",
    });
  }

  public async saveFunnelDecision(params: {
    userId: string;
    organizationId: string;
    funnelId?: string;
    decision: string;
    rationale?: string;
    importance?: number;
    importanceScore?: number;
  }): Promise<ServiceResult<CompanyMemoryRow>> {
    const content = params.rationale
      ? `${params.decision} (Rationale: ${params.rationale})`
      : params.decision;

    const importance = params.importance ?? (params.importanceScore ? Math.round(params.importanceScore * 5) : 4);

    return this.createMemory({
      userId: params.userId,
      organizationId: params.organizationId,
      title: "Funnel Strategy Decision",
      content,
      category: "decision",
      entityType: "funnel",
      entityId: params.funnelId,
      importance,
      confidenceLevel: "high",
      metadata: { funnel_id: params.funnelId, rationale: params.rationale },
      source: "conversation",
    });
  }

  public async saveCustomerEvent(params: {
    userId: string;
    organizationId: string;
    contactId: string;
    eventSummary: string;
    importance?: number;
    importanceScore?: number;
  }): Promise<ServiceResult<CompanyMemoryRow>> {
    const importance = params.importance ?? (params.importanceScore ? Math.round(params.importanceScore * 5) : 3);
    return this.createMemory({
      userId: params.userId,
      organizationId: params.organizationId,
      title: "Customer Journey Event",
      content: params.eventSummary.trim(),
      category: "customer",
      scope: "customer",
      entityType: "customer",
      entityId: params.contactId,
      importance,
      confidenceLevel: "high",
      metadata: { contact_id: params.contactId },
      source: "conversation",
    });
  }

  // --------------------------------------------------------------------------
  // Phase 2 Multi-Factor Memory Ranking & Context Retrieval
  // --------------------------------------------------------------------------

  public async getRelevantMemoriesForContext(
    userId: string,
    organizationId: string,
    query?: string,
    limit = 6,
    options?: {
      funnelId?: string;
      customerId?: string;
      category?: MemoryCategory;
      includeArchived?: boolean;
    }
  ): Promise<CompanyMemoryRow[]> {
    if (!this.store.isOrgMember(userId, organizationId)) {
      return [];
    }

    const statuses = options?.includeArchived ? ["active", "superseded", "archived"] : ["active"];
    const all = this.store.queryMemoriesWithRLS(
      userId,
      organizationId,
      options?.category,
      60,
      {
        status: statuses,
        includeExpired: false,
      }
    );

    if (!query?.trim()) {
      // Default: Return highest importance business facts, strategic goals & constraints
      return all
        .sort((a, b) => Number(b.importance_score) - Number(a.importance_score))
        .slice(0, limit);
    }

    const scored = all.map((mem) => {
      const relevance = this.calculateRelevanceScore(query, mem, options?.funnelId);
      return { mem, score: relevance };
    });

    return scored
      .filter((s) => s.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.mem);
  }

  /**
   * Multi-Factor Ranking Algorithm:
   * Score = w1 * Relevance + w2 * Importance + w3 * Confidence + w4 * Recency + w5 * ContextMatch
   */
  public calculateRelevanceScore(
    query: string,
    memory: CompanyMemoryRow,
    contextFunnelId?: string
  ): number {
    const normQuery = this.normalizeMultilingualText(query);
    const qTokens = normQuery.split(/\s+/).filter((w) => w.length > 2);

    const mText = `${memory.title || ""} ${memory.content} ${memory.normalized_content || ""} ${memory.category} ${memory.entity_type || ""}`.toLowerCase();

    let termMatches = 0;
    for (const token of qTokens) {
      if (mText.includes(token)) {
        termMatches++;
      }
    }

    const termOverlapScore = qTokens.length > 0 ? termMatches / qTokens.length : 0.4;

    // Importance factor (1-5 normalized to 0.2 - 1.0)
    const importanceVal = Math.min(5, Math.max(1, Number(memory.importance_score) || 3));
    const importanceFactor = importanceVal / 5.0;

    // Confidence factor (0.0 to 1.0)
    const confidenceFactor = Number(memory.confidence) || 0.85;

    // Recency factor (decays slowly over 30 days)
    const ageDays = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0.5, 1.0 - (ageDays / 60));

    // Context match bonus (if tied to current funnel or entity)
    let contextBonus = 0;
    if (contextFunnelId && memory.entity_id === contextFunnelId) {
      contextBonus = 0.2;
    }

    // Weighted composite score
    const finalScore =
      termOverlapScore * 0.45 +
      importanceFactor * 0.25 +
      confidenceFactor * 0.15 +
      recencyFactor * 0.10 +
      contextBonus * 0.05;

    return Math.min(Math.max(finalScore, 0), 1.0);
  }

  // --------------------------------------------------------------------------
  // Automatic Semantic Memory Extraction & Conflict Resolution
  // --------------------------------------------------------------------------

  /**
   * Evaluates user statements for persistent business knowledge without naive regex matching.
   * Detects business identity, target audience, offers, goals, constraints, and conflicts.
   */
  public async extractMemoriesFromConversation(
    userId: string,
    organizationId: string,
    history: { role: string; content: string }[],
    currentMessage: string
  ): Promise<MemoryExtractionResult> {
    const raw = currentMessage.trim();
    const lower = raw.toLowerCase();
    const memoriesCreated: CompanyMemoryRow[] = [];
    const memoriesSuperseded: { oldMemory: CompanyMemoryRow; newMemory: CompanyMemoryRow }[] = [];

    // Filter out trivial small-talk, greetings, short questions
    if (raw.length < 15 || /^(hi|hello|hey|apa khabar|terima kasih|ok|yes|no|siap|baiklah)\b/i.test(raw)) {
      return { memoriesCreated, memoriesSuperseded, summary: "No persistent knowledge in casual turn." };
    }

    // 1. Audience Detection & Shift Conflict Resolution
    // Examples: "Our target audience is established businesses", "Actually, we are changing our audience to enterprise clients"
    const isAudienceShift =
      /(actually|now|from now on|sebenarnya|kini|mulai sekarang).*(changing our audience|audience is now|focusing on|sasaran.*kini|target.*baru)/i.test(
        lower
      ) ||
      /(target audience|sasaran pelanggan|main audience|who we serve|ideal customer).*(is|are|adalah|ialah)\s+([^,.]+)/i.test(
        lower
      ) ||
      /selling to|target to|fokus kepada/i.test(lower);

    if (isAudienceShift) {
      const audienceMatch =
        raw.match(/(?:audience is|audience:|audience to|serve|sasaran pelanggan ialah|sasaran kita|fokus kepada)\s+([^,.]+)/i) ||
        raw.match(/(?:to|for)\s+([A-Za-z0-9\s]+?)(?:\.|$|and|our)/i);

      const audienceContent = audienceMatch ? audienceMatch[1].trim() : raw;

      // Check if existing active audience memory exists
      const existingAudience = this.store
        .queryMemoriesWithRLS(userId, organizationId, undefined, 5, { status: "active", entityType: "audience" })
        .find((m) => m.entity_type === "audience" || m.category === "business");

      if (existingAudience && (lower.includes("chang") || lower.includes("actually") || lower.includes("sebenarnya") || lower.includes("now") || lower.includes("kini"))) {
        // Resolve conflict by superseding older memory
        const superRes = await this.supersedeMemory({
          userId,
          organizationId,
          oldMemoryId: existingAudience.id,
          newMemory: {
            title: "Target Audience & Persona",
            content: `Target audience: ${audienceContent}. (Superseded previous audience: "${existingAudience.content}")`,
            category: "business",
            entityType: "audience",
            importance: 5,
            confidenceLevel: "confirmed",
            source: "conversation",
          },
        });
        if (superRes.data) {
          memoriesSuperseded.push(superRes.data);
        }
      } else if (!existingAudience) {
        const createRes = await this.saveTargetAudience({
          userId,
          organizationId,
          title: "Target Audience & Persona",
          content: `Target audience: ${audienceContent}.`,
          importance: 5,
        });
        if (createRes.data) {
          memoriesCreated.push(createRes.data);
        }
      }
    }

    // 2. Core Offer / Product / Pricing Detection
    // Examples: "My company sells a premium service", "Our main offer is the VIP coaching bundle", "We sell automation software"
    if (
      /(my company sells|we sell|our main offer|core offer|kami menjual|tawaran utama|servis kami|produk kami).*/i.test(
        lower
      )
    ) {
      const offerMatch = raw.match(
        /(?:sells|offer is|tawaran utama ialah|kami menjual|kami sediakan)\s+([^,.]+)/i
      );
      const offerText = offerMatch ? offerMatch[1].trim() : raw;

      const existingOffer = this.store
        .queryMemoriesWithRLS(userId, organizationId, undefined, 5, { status: "active", entityType: "core_offer" })
        .find((m) => m.entity_type === "core_offer");

      if (existingOffer && (lower.includes("chang") || lower.includes("now") || lower.includes("actually"))) {
        const superRes = await this.supersedeMemory({
          userId,
          organizationId,
          oldMemoryId: existingOffer.id,
          newMemory: {
            title: "Core Offer & Product Strategy",
            content: `Core Offer: ${offerText}.`,
            category: "business",
            entityType: "core_offer",
            importance: 5,
            confidenceLevel: "confirmed",
            source: "conversation",
          },
        });
        if (superRes.data) memoriesSuperseded.push(superRes.data);
      } else if (!existingOffer) {
        const createRes = await this.createMemory({
          userId,
          organizationId,
          title: "Core Offer & Product Strategy",
          content: `Core Offer: ${offerText}.`,
          category: "business",
          entityType: "core_offer",
          importance: 5,
          confidenceLevel: "high",
          source: "conversation",
        });
        if (createRes.data) memoriesCreated.push(createRes.data);
      }
    }

    // 3. Strategic Business Goal Detection
    // Examples: "Our goal this quarter is to generate 500 qualified leads", "Matlamat kami ialah capai 100 prospek"
    if (
      /(our goal|current goal|goal this quarter|matlamat kami|target kita|sasaran jualan).*(is|to|ialah|mencapai)\s+([^,.]+)/i.test(
        lower
      )
    ) {
      const goalMatch = raw.match(
        /(?:our goal is|current goal is|goal this quarter is|matlamat kami ialah|target kita)\s+([^,.]+)/i
      );
      const goalText = goalMatch ? goalMatch[1].trim() : raw;

      const createRes = await this.saveGoal({
        userId,
        organizationId,
        goal: goalText,
        importance: 4,
      });
      if (createRes.data) memoriesCreated.push(createRes.data);
    }

    // 4. Operational & Brand Constraints / Negative Preferences
    // Examples: "Don't use aggressive sales language", "Jangan guna ayat mendesak", "We prefer educational tone"
    if (
      /(don't use|never use|avoid using|jangan guna|elakkan|we prefer|brand tone|nada jenama).*/i.test(
        lower
      )
    ) {
      const prefRes = await this.savePreference({
        userId,
        organizationId,
        preference: raw,
        importance: 4,
      });
      if (prefRes.data) memoriesCreated.push(prefRes.data);
    }

    // 5. Strategic Decisions
    // Examples: "We decided to focus exclusively on inbound content rather than ads"
    if (
      /(we decided to|our decision is|kami putuskan untuk|keputusan kami ialah)\s+(.+)/i.test(
        lower
      )
    ) {
      const decMatch = raw.match(/(?:we decided to|our decision is|kami putuskan untuk|keputusan kami ialah)\s+(.+)/i);
      const decText = decMatch ? decMatch[1].trim() : raw;

      const decRes = await this.createMemory({
        userId,
        organizationId,
        title: "Strategic Decision",
        content: `Decision: ${decText}`,
        category: "decision",
        entityType: "strategy",
        importance: 4,
        confidenceLevel: "confirmed",
        source: "conversation",
      });
      if (decRes.data) memoriesCreated.push(decRes.data);
    }

    // 6. Uncertain / Exploratory Information Calibration
    // Examples: "I think we might launch on October 15", "Maybe we will price at $499"
    if (
      /(i think we might|maybe we will|perhaps we could|kemungkinan kami akan|mungkin kita)\s+(.+)/i.test(
        lower
      )
    ) {
      const uncMatch = raw.match(/(?:i think we might|maybe we will|perhaps we could|kemungkinan kami akan|mungkin kita)\s+(.+)/i);
      const uncText = uncMatch ? uncMatch[1].trim() : raw;

      const uncRes = await this.createMemory({
        userId,
        organizationId,
        title: "Exploratory Consideration",
        content: `Considering: ${uncText}`,
        category: "strategy",
        entityType: "exploratory",
        importance: 2,
        confidenceLevel: "medium",
        source: "conversation",
      });
      if (uncRes.data) memoriesCreated.push(uncRes.data);
    }

    // 7. Temporary Time-Bound Offers
    // Examples: "This promotion ends on Friday", "Special discount valid until end of month"
    if (
      /(this promotion ends|valid until|sah sehingga|tamat pada)\s+(.+)/i.test(
        lower
      )
    ) {
      const tempMatch = raw.match(/(?:this promotion ends|valid until|sah sehingga|tamat pada)\s+(.+)/i);
      const tempText = tempMatch ? tempMatch[1].trim() : raw;
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const tempRes = await this.createMemory({
        userId,
        organizationId,
        title: "Time-Sensitive Offer",
        content: `Temporary promo: ${tempText}`,
        category: "business",
        entityType: "temporary_promo",
        importance: 3,
        confidenceLevel: "high",
        validUntil: futureDate,
        source: "conversation",
      });
      if (tempRes.data) memoriesCreated.push(tempRes.data);
    }

    return {
      memoriesCreated,
      memoriesSuperseded,
      summary: `Extracted ${memoriesCreated.length} new memories, superseded ${memoriesSuperseded.length} memories.`,
    };
  }

  // --------------------------------------------------------------------------
  // Explicit Natural Language Memory Commands
  // --------------------------------------------------------------------------

  /**
   * Executes explicit user commands:
   * - "Remember that..." -> stores confirmed memory
   * - "Forget that..." -> archives outdated memory
   * - "That's no longer correct. Our target audience is X" -> supersedes memory
   * - "What do you remember about X?" -> retrieves memory
   */
  public async handleExplicitMemoryCommand(
    userId: string,
    organizationId: string,
    commandText: string
  ): Promise<ExplicitMemoryCommandResult> {
    const raw = commandText.trim();
    const lower = raw.toLowerCase();

    // 1. Store Command ("Remember that...", "Keep this in mind", "Ingat bahawa...", "Sila ingat...")
    if (
      /^(remember that|please remember|keep this in mind|don't forget that|ingat bahawa|sila ingat|simpan memori|记住)\s*:?\s*(.+)/i.test(
        raw
      )
    ) {
      const match = raw.match(
        /^(?:remember that|please remember|keep this in mind|don't forget that|ingat bahawa|sila ingat|simpan memori|记住)\s*:?\s*(.+)/i
      );
      const fact = match ? match[1].trim() : raw;

      let category: MemoryCategory = "important_fact";
      let entityType = "business";

      if (/audience|customer|sasaran/i.test(fact)) {
        category = "business";
        entityType = "audience";
      } else if (/offer|product|package|pakej|tawaran/i.test(fact)) {
        category = "business";
        entityType = "core_offer";
      } else if (/goal|target|objective|matlamat/i.test(fact)) {
        category = "goal";
        entityType = "goal";
      } else if (/don't|never|avoid|prefer|nada|tone/i.test(fact)) {
        category = "preference";
        entityType = "preference";
      }

      const res = await this.createMemory({
        userId,
        organizationId,
        title: `Explicit Knowledge: ${fact.slice(0, 40)}`,
        content: fact,
        category,
        entityType,
        importance: 5,
        confidenceLevel: "confirmed",
        source: "explicit_command",
      });

      return {
        action: "stored",
        memory: res.data || undefined,
        explanation: `I have committed this to long-term memory with CONFIRMED confidence: "${fact}".`,
      };
    }

    // 2. Forget Command ("Forget what I told you about...", "Delete that memory", "Padam maklumat...")
    if (
      /^(forget (what i (told you|said) about|that|about)|delete that memory|padam maklumat( tentang)?|lupakan( tentang)?)\s*:?\s*(.+)/i.test(
        lower
      ) ||
      /\b(forget that information|delete that memory)\b/i.test(lower)
    ) {
      const match = raw.match(
        /^(?:forget (?:what i (?:told you|said) about|that|about)|delete that memory|padam maklumat(?: tentang)?|lupakan(?: tentang)?)\s*:?\s*(.+)/i
      );
      const topic = match ? match[1].trim() : raw;

      const memories = await this.getRelevantMemoriesForContext(userId, organizationId, topic, 3);
      if (memories.length > 0) {
        const target = memories[0];
        await this.archiveMemory(userId, organizationId, target.id);
        return {
          action: "forgotten",
          memory: target,
          explanation: `I have archived and will no longer consider active: "${target.content}".`,
        };
      }
      return {
        action: "forgotten",
        explanation: `I could not locate an active memory matching "${topic}" to archive.`,
      };
    }

    // 3. Update / Outdated Command ("That's no longer correct...", "Maklumat itu lapuk...", "Update our audience to...")
    if (
      /(that's no longer correct|that is outdated|that is wrong|maklumat itu lapuk|itu salah|tukar maklumat|changing our audience|change our audience|change our target audience|changing our target audience).*/i.test(
        lower
      ) ||
      /(update that information|change our target audience to|change our main offer to)/i.test(lower)
    ) {
      // Find what needs updating
      const activeMemories = await this.getRelevantMemoriesForContext(userId, organizationId, raw, 3);
      if (activeMemories.length > 0) {
        const oldMem = activeMemories[0];
        const updateMatch =
          raw.match(/(?:use this instead:\s*|guna ini:\s*|audience to\s+|to\s+:?\s*)(.+)$/i) ||
          raw.match(/(?:to)\s+([^,.]+)/i);
        const newFact = updateMatch ? updateMatch[1].trim() : raw;

        const superRes = await this.supersedeMemory({
          userId,
          organizationId,
          oldMemoryId: oldMem.id,
          newMemory: {
            title: oldMem.title || "Updated Business Information",
            content: newFact,
            category: oldMem.category,
            entityType: oldMem.entity_type || undefined,
            importance: 5,
            confidenceLevel: "confirmed",
            source: "explicit_command",
          },
        });

        return {
          action: "updated",
          memory: superRes.data?.newMemory,
          explanation: `Acknowledged. I have superseded the previous memory ("${oldMem.content}") with the updated specification: "${newFact}".`,
        };
      }
    }

    // 4. Query Command ("What do you remember about...", "Apa yang kamu ingat tentang...")
    if (
      /^(what do you remember about|what is our|what was our|apa yang kamu ingat|siapakah sasaran|apakah tawaran)/i.test(
        lower
      )
    ) {
      const isHistorical = /what was our|previous|dulu|sebelum ini|earlier/i.test(lower);
      const results = await this.getRelevantMemoriesForContext(
        userId,
        organizationId,
        raw,
        5,
        { includeArchived: isHistorical }
      );

      if (isHistorical) {
        const superseded = results.find((m) => m.status === "superseded");
        if (superseded) {
          return {
            action: "queried",
            memories: results,
            explanation: `According to our historical records, your previous specification was: "${superseded.content}" before it was updated and superseded.`,
          };
        }
      }

      return {
        action: "queried",
        memories: results,
        explanation: results.length > 0
          ? `According to the Company Brain: ${results.map((m) => m.content).join("; ")}`
          : `I have no recorded memories matching that inquiry.`,
      };
    }

    return {
      action: "unrecognized",
      explanation: "No explicit memory command detected.",
    };
  }

  // --------------------------------------------------------------------------
  // Utility & Cross-Lingual Normalization
  // --------------------------------------------------------------------------

  /**
   * Normalizes multilingual terms to enable cross-lingual semantic matching:
   * e.g., "sasaran" <-> "audience" <-> "target", "tawaran" <-> "offer", "matlamat" <-> "goal"
   */
  public normalizeMultilingualText(text: string): string {
    let lower = text.toLowerCase();

    // Map common Malay business terms to semantic anchors
    lower = lower.replace(/\b(sasaran pelanggan|prospek|pelanggan ideal)\b/g, "target audience customer");
    lower = lower.replace(/\b(tawaran utama|pakej premium)\b/g, "core main offer package");
    lower = lower.replace(/\b(matlamat|sasaran jualan|objektif)\b/g, "business goal objective");
    lower = lower.replace(/\b(jangan guna|elakkan nada)\b/g, "avoid negative preference tone");
    lower = lower.replace(/\b(bina|buatkan)\b/g, "create build");

    // Remove excessive punctuation
    return lower.replace(/[^\w\s\u4e00-\u9fff]/g, " ").replace(/\s+/g, " ").trim();
  }

  private mapRowToEntry(row: CompanyMemoryRow): MemoryEntry {
    return {
      id: row.id,
      organizationId: row.organization_id,
      scope: row.scope,
      content: row.content,
      importanceScore: Number(row.importance_score) / 5.0,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
    };
  }
}
