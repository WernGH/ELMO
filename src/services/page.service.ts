/**
 * ELMO Phase 1 — Page Service
 * Authoritative business service for Pages and Structured Section Components.
 * Guarantees that pages are composed of structured component models rather than raw unconstrained HTML.
 */

import { MockDataStore, PageRow, PageSectionRow } from "@/lib/supabase/mock-store";
import { PageType, PageStatus, SectionType } from "@/types/database.types";
import { ServiceResult } from "./funnel.service";

export interface CreatePageParams {
  userId: string;
  organizationId: string;
  funnelId?: string;
  name: string;
  slug: string;
  pageType?: PageType;
  status?: PageStatus;
  title?: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdatePageParams {
  userId: string;
  organizationId: string;
  pageId: string;
  name?: string;
  slug?: string;
  pageType?: PageType;
  status?: PageStatus;
  title?: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreatePageSectionParams {
  userId: string;
  organizationId: string;
  pageId: string;
  sectionType: SectionType;
  orderIndex?: number;
  content?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export class PageService {
  private static instance: PageService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): PageService {
    if (!PageService.instance) {
      PageService.instance = new PageService();
    }
    return PageService.instance;
  }

  public async getPages(
    userId: string,
    organizationId: string,
    funnelId?: string
  ): Promise<ServiceResult<PageRow[]>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const pages = this.store.queryPagesWithRLS(userId, organizationId, funnelId);
      return { data: pages, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getPageById(
    userId: string,
    organizationId: string,
    pageId: string
  ): Promise<ServiceResult<PageRow>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const page = this.store.getPageWithRLS(userId, organizationId, pageId);
      if (!page) {
        return { data: null, error: "Page not found." };
      }
      return { data: page, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createPage(params: CreatePageParams): Promise<ServiceResult<PageRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      if (!params.name?.trim()) {
        return { data: null, error: "Page name is required." };
      }
      if (!params.slug?.trim()) {
        return { data: null, error: "Page slug is required." };
      }

      // If funnelId is provided, verify it belongs to organization
      if (params.funnelId) {
        const funnel = this.store.getFunnelWithRLS(params.userId, params.organizationId, params.funnelId);
        if (!funnel) {
          return { data: null, error: "Associated funnel not found in organization." };
        }
      }

      const created = this.store.createPage({
        organization_id: params.organizationId,
        funnel_id: params.funnelId || null,
        name: params.name.trim(),
        slug: params.slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-"),
        page_type: params.pageType || "landing",
        status: params.status || "draft",
        title: params.title || params.name.trim(),
        settings: params.settings || {},
        metadata: params.metadata || {},
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async updatePage(params: UpdatePageParams): Promise<ServiceResult<PageRow>> {
    try {
      if (!this.store.isOrgMember(params.userId, params.organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }

      const existing = this.store.getPageWithRLS(params.userId, params.organizationId, params.pageId);
      if (!existing) {
        return { data: null, error: "Page not found or access denied." };
      }

      const updates: Partial<PageRow> = {};
      if (params.name !== undefined) updates.name = params.name.trim();
      if (params.slug !== undefined) updates.slug = params.slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-");
      if (params.pageType !== undefined) updates.page_type = params.pageType;
      if (params.status !== undefined) updates.status = params.status;
      if (params.title !== undefined) updates.title = params.title;
      if (params.settings !== undefined) updates.settings = params.settings;
      if (params.metadata !== undefined) updates.metadata = params.metadata;

      const updated = this.store.updatePage(params.userId, params.organizationId, params.pageId, updates);
      return { data: updated, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async deletePage(
    userId: string,
    organizationId: string,
    pageId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const success = this.store.deletePage(userId, organizationId, pageId);
      if (!success) {
        return { data: null, error: "Page could not be deleted or not found." };
      }
      return { data: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  // Page Sections
  public async getSections(
    userId: string,
    organizationId: string,
    pageId: string
  ): Promise<ServiceResult<PageSectionRow[]>> {
    try {
      const sections = this.store.queryPageSectionsWithRLS(userId, organizationId, pageId);
      return { data: sections, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async createSection(params: CreatePageSectionParams): Promise<ServiceResult<PageSectionRow>> {
    try {
      const page = this.store.getPageWithRLS(params.userId, params.organizationId, params.pageId);
      if (!page) {
        return { data: null, error: "Target page not found or access denied." };
      }

      const existingSections = this.store.queryPageSectionsWithRLS(params.userId, params.organizationId, params.pageId);
      const nextIndex =
        params.orderIndex ??
        (existingSections.length > 0 ? Math.max(...existingSections.map((s) => s.order_index)) + 1 : 1);

      const created = this.store.createPageSection({
        page_id: params.pageId,
        section_type: params.sectionType,
        order_index: nextIndex,
        content: params.content || {},
        layout: params.layout || {},
        styles: params.styles || {},
        settings: params.settings || {},
      });

      return { data: created, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async updateSection(
    userId: string,
    organizationId: string,
    sectionId: string,
    updates: Partial<PageSectionRow>
  ): Promise<ServiceResult<PageSectionRow>> {
    try {
      const updated = this.store.updatePageSection(userId, organizationId, sectionId, updates);
      if (!updated) {
        return { data: null, error: "Section not found or access denied." };
      }
      return { data: updated, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async deleteSection(
    userId: string,
    organizationId: string,
    sectionId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const success = this.store.deletePageSection(userId, organizationId, sectionId);
      if (!success) {
        return { data: null, error: "Section not found or access denied." };
      }
      return { data: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }
}
