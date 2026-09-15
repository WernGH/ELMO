/**
 * ELMO Phase 1 — Analytics Service Foundation
 * Event-based analytics architecture recording visitor, funnel, lead, and conversion signals.
 * Calculates aggregated key funnel metrics without heavy BI dependencies.
 */

import { MockDataStore, AnalyticsEventRow } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { AnalyticsEventType } from "@/types/database.types";
import { ServiceResult } from "./funnel.service";

export interface RecordAnalyticsEventParams {
  organizationId: string;
  eventType: AnalyticsEventType;
  funnelId?: string;
  pageId?: string;
  contactId?: string;
  metadata?: Record<string, unknown>;
}

export interface FunnelMetricsSummary {
  funnelId: string;
  totalVisitors: number;
  totalLeads: number;
  totalPurchases: number;
  conversionRate: number; // percentage (0 - 100)
  eventBreakdown: Record<string, number>;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async recordEvent(params: RecordAnalyticsEventParams): Promise<ServiceResult<AnalyticsEventRow>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("analytics_events") as any)
          .insert({
            organization_id: params.organizationId,
            event_type: params.eventType,
            funnel_id: params.funnelId || null,
            page_id: params.pageId || null,
            contact_id: params.contactId || null,
            metadata: params.metadata || {},
          })
          .select()
          .single();

        if (error || !data) return { data: null, error: error?.message || "Failed to record analytics event." };
        return { data: data as AnalyticsEventRow, error: null };
      }

      const row = this.store.recordAnalyticsEvent({
        organization_id: params.organizationId,
        event_type: params.eventType,
        funnel_id: params.funnelId || null,
        page_id: params.pageId || null,
        contact_id: params.contactId || null,
        metadata: params.metadata || {},
      });
      return { data: row, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getEvents(
    userId: string,
    organizationId: string,
    filter?: { eventType?: string; funnelId?: string; pageId?: string }
  ): Promise<ServiceResult<AnalyticsEventRow[]>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        let q = (supabase.from("analytics_events") as any)
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (filter?.eventType) q = q.eq("event_type", filter.eventType);
        if (filter?.funnelId) q = q.eq("funnel_id", filter.funnelId);
        if (filter?.pageId) q = q.eq("page_id", filter.pageId);

        const { data, error } = await q;
        if (error) return { data: null, error: error.message };
        return { data: (data as AnalyticsEventRow[]) || [], error: null };
      }

      if (!this.store.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Unauthorized: User is not an organization member." };
      }
      const events = this.store.queryAnalyticsEventsWithRLS(userId, organizationId, filter);
      return { data: events, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }

  public async getFunnelMetrics(
    userId: string,
    organizationId: string,
    funnelId: string
  ): Promise<ServiceResult<FunnelMetricsSummary>> {
    try {
      let events: AnalyticsEventRow[] = [];
      if (isSupabaseConfigured()) {
        const eventsRes = await this.getEvents(userId, organizationId, { funnelId });
        events = eventsRes.data || [];
      } else {
        if (!this.store.isOrgMember(userId, organizationId)) {
          return { data: null, error: "Unauthorized: User is not an organization member." };
        }
        events = this.store.queryAnalyticsEventsWithRLS(userId, organizationId, { funnelId });
      }
      const breakdown: Record<string, number> = {};

      let visitors = 0;
      let leads = 0;
      let purchases = 0;

      for (const ev of events) {
        breakdown[ev.event_type] = (breakdown[ev.event_type] || 0) + 1;
        if (ev.event_type === "page_view" || ev.event_type === "funnel_visit") {
          visitors++;
        } else if (ev.event_type === "form_submission" || ev.event_type === "conversion") {
          leads++;
        } else if (ev.event_type === "purchase" || ev.event_type === "checkout") {
          purchases++;
        }
      }

      const conversionRate = visitors > 0 ? parseFloat(((leads / visitors) * 100).toFixed(2)) : 0;

      return {
        data: {
          funnelId,
          totalVisitors: visitors,
          totalLeads: leads,
          totalPurchases: purchases,
          conversionRate,
          eventBreakdown: breakdown,
        },
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  }
}
