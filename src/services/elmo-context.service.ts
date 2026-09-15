/**
 * ELMO Phase 1 — ELMO Context Service (ElmoContextService)
 *
 * Authoritative Context Assembly Layer.
 * Retrieves only the minimal, relevant business and operational context required for a turn:
 * USER CONTEXT + BUSINESS CONTEXT + CONVERSATION CONTEXT + CURRENT WORKSPACE + CURRENT FUNNEL + CURRENT PAGE + TASK CONTEXT = ELMO CONTEXT
 *
 * CRITICAL RULE: NEVER dumps the entire database into Gemini!
 */

import { MockDataStore } from "@/lib/supabase/mock-store";
import { FunnelService } from "./funnel.service";
import { PageService } from "./page.service";
import { AnalyticsService } from "./analytics.service";
import { MessageRole } from "@/types/chat.types";
import { LanguageContext } from "./language-context.service";
import { ElmoMemoryService } from "./elmo-memory.service";

export interface ElmoContextParams {
  userId: string;
  organizationId: string;
  conversationId?: string;
  funnelId?: string;
  pageId?: string;
  currentTask?: string;
  memoryQuery?: string;
  recentMessagesLimit?: number;
  languageContext?: LanguageContext;
}

export interface UserContextSummary {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

export interface OrganizationContextSummary {
  id: string;
  name: string;
  slug: string;
  autonomyMode: string;
  elmoStatus: string;
}

export interface FunnelContextSummary {
  id: string;
  name: string;
  goal: string | null;
  funnelType: string;
  targetAudience: string | null;
  offer: string | null;
  primaryConversionGoal: string | null;
  status: string;
  stepCount: number;
  steps: { order: number; type: string; name: string }[];
}

export interface PageContextSummary {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  status: string;
  sectionCount: number;
  sectionTypes: string[];
}

export interface CompanyBrainContextSummary {
  businessIdentity?: string;
  targetAudience?: string;
  coreOffers?: string;
  goalsAndPriorities?: string;
  constraintsAndPreferences?: string;
  historicalKnowledge?: string;
}

export interface AssembledElmoContext {
  user: UserContextSummary;
  organization: OrganizationContextSummary;
  currentFunnel?: FunnelContextSummary;
  currentPage?: PageContextSummary;
  currentTask?: string;
  recentMessages: { role: MessageRole; content: string }[];
  memories?: { category: string; content: string; importance: number; status?: string }[];
  companyBrain?: CompanyBrainContextSummary;
  funnelMetrics?: {
    visitors: number;
    leads: number;
    conversionRate: number;
  };
  systemInstruction: string;
  tokenEstimate: number;
}

export class ElmoContextService {
  private static instance: ElmoContextService;
  private store: MockDataStore;
  private funnelService: FunnelService;
  private pageService: PageService;
  private analyticsService: AnalyticsService;

  private constructor() {
    this.store = MockDataStore.getInstance();
    this.funnelService = FunnelService.getInstance();
    this.pageService = PageService.getInstance();
    this.analyticsService = AnalyticsService.getInstance();
  }

  public static getInstance(): ElmoContextService {
    if (!ElmoContextService.instance) {
      ElmoContextService.instance = new ElmoContextService();
    }
    return ElmoContextService.instance;
  }

  /**
   * Assembles the precise, targeted context for ELMO reasoning.
   */
  public async assembleContext(params: ElmoContextParams): Promise<AssembledElmoContext> {
    const limit = params.recentMessagesLimit || 20;

    // 1. User Context
    const profile = this.store.profiles.get(params.userId);
    const userRole = this.store.getOrgRole(params.userId, params.organizationId) || "owner";
    const userObj = this.store.users.get(params.userId);

    const user: UserContextSummary = {
      id: params.userId,
      displayName: profile?.display_name || "Superior",
      email: userObj?.email || "founder@elmo-ai.com",
      role: userRole,
    };

    // 2. Organization Context
    const org = this.store.organizations.get(params.organizationId);
    const orgSettings = (org?.settings as Record<string, unknown>) || {};
    const organization: OrganizationContextSummary = {
      id: params.organizationId,
      name: org?.name || "Autonomous Enterprise",
      slug: org?.slug || "enterprise",
      autonomyMode: (orgSettings.autonomy_mode as string) || "supervised",
      elmoStatus: (orgSettings.elmo_status as string) || "active",
    };

    // 3. Current Funnel Context (Targeted slice only)
    let currentFunnel: FunnelContextSummary | undefined;
    let funnelMetrics: { visitors: number; leads: number; conversionRate: number } | undefined;

    if (params.funnelId) {
      const fRes = await this.funnelService.getFunnelById(params.userId, params.organizationId, params.funnelId);
      if (fRes.data) {
        const stepsRes = await this.funnelService.getFunnelSteps(params.userId, params.organizationId, params.funnelId);
        const steps = stepsRes.data || [];

        currentFunnel = {
          id: fRes.data.id,
          name: fRes.data.name,
          goal: fRes.data.goal,
          funnelType: fRes.data.funnel_type,
          targetAudience: fRes.data.target_audience,
          offer: fRes.data.offer,
          primaryConversionGoal: fRes.data.primary_conversion_goal,
          status: fRes.data.status,
          stepCount: steps.length,
          steps: steps.map((s) => ({
            order: s.step_order,
            type: s.step_type,
            name: s.name,
          })),
        };

        const metricsRes = await this.analyticsService.getFunnelMetrics(
          params.userId,
          params.organizationId,
          params.funnelId
        );
        if (metricsRes.data) {
          funnelMetrics = {
            visitors: metricsRes.data.totalVisitors,
            leads: metricsRes.data.totalLeads,
            conversionRate: metricsRes.data.conversionRate,
          };
        }
      }
    }

    // 4. Current Page Context (Targeted slice only)
    let currentPage: PageContextSummary | undefined;
    if (params.pageId) {
      const pRes = await this.pageService.getPageById(params.userId, params.organizationId, params.pageId);
      if (pRes.data) {
        const secRes = await this.pageService.getSections(params.userId, params.organizationId, params.pageId);
        const sections = secRes.data || [];
        currentPage = {
          id: pRes.data.id,
          name: pRes.data.name,
          slug: pRes.data.slug,
          pageType: pRes.data.page_type,
          status: pRes.data.status,
          sectionCount: sections.length,
          sectionTypes: sections.map((s) => s.section_type),
        };
      }
    }

    // 5. Recent Conversation History (bounded by limit)
    let recentMessages: { role: MessageRole; content: string }[] = [];
    if (params.conversationId) {
      const rawMessages = this.store.queryMessagesWithRLS(
        params.userId,
        params.organizationId,
        params.conversationId
      );
      recentMessages = rawMessages.slice(-limit).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    // 6. Relevant Organizational & Funnel Memory & Company Brain
    const memoryService = ElmoMemoryService.getInstance();
    const memoryQuery =
      params.memoryQuery ||
      params.currentTask ||
      (currentFunnel ? `${currentFunnel.name} ${currentFunnel.targetAudience || ""} ${currentFunnel.offer || ""}` : undefined);
    const memoryRows = await memoryService.getRelevantMemoriesForContext(
      params.userId,
      params.organizationId,
      memoryQuery,
      8,
      { funnelId: params.funnelId }
    );
    const memories = memoryRows.map((m) => ({
      category: m.category,
      content: m.content,
      importance: Number(m.importance_score),
      status: m.status,
    }));

    // Build structured Company Brain summary
    const companyBrain: CompanyBrainContextSummary = {};
    const identities = memoryRows.filter((m) => m.entity_type === "business_identity" || (m.category === "business" && !m.entity_type));
    if (identities.length > 0) {
      companyBrain.businessIdentity = identities.map((m) => m.content).join(" | ");
    }
    const audiences = memoryRows.filter((m) => m.entity_type === "audience");
    if (audiences.length > 0) {
      companyBrain.targetAudience = audiences.map((m) => m.content).join(" | ");
    }
    const offers = memoryRows.filter((m) => m.entity_type === "core_offer");
    if (offers.length > 0) {
      companyBrain.coreOffers = offers.map((m) => m.content).join(" | ");
    }
    const goals = memoryRows.filter((m) => m.category === "goal" || m.category === "strategy" || m.category === "decision");
    if (goals.length > 0) {
      companyBrain.goalsAndPriorities = goals.map((m) => m.content).join(" | ");
    }
    const prefs = memoryRows.filter((m) => m.category === "preference");
    if (prefs.length > 0) {
      companyBrain.constraintsAndPreferences = prefs.map((m) => m.content).join(" | ");
    }

    // 7. System Instruction Construction
    const systemInstruction = this.constructSystemInstruction({
      user,
      organization,
      currentFunnel,
      currentPage,
      currentTask: params.currentTask,
      memories,
      companyBrain,
      languageContext: params.languageContext,
      funnelMetrics,
    });

    // Calculate token estimate (~4 characters per token)
    const totalChars =
      systemInstruction.length +
      recentMessages.reduce((acc, m) => acc + m.content.length, 0);
    const tokenEstimate = Math.ceil(totalChars / 4);

    return {
      user,
      organization,
      currentFunnel,
      currentPage,
      currentTask: params.currentTask,
      recentMessages,
      memories,
      companyBrain,
      funnelMetrics,
      systemInstruction,
      tokenEstimate,
    };
  }

  private constructSystemInstruction(context: {
    user: UserContextSummary;
    organization: OrganizationContextSummary;
    currentFunnel?: FunnelContextSummary;
    currentPage?: PageContextSummary;
    currentTask?: string;
    memories?: { category: string; content: string; importance: number; status?: string }[];
    companyBrain?: CompanyBrainContextSummary;
    languageContext?: LanguageContext;
    funnelMetrics?: { visitors: number; leads: number; conversionRate: number };
  }): string {
    const targetLang = context.languageContext?.responseLanguage;
    const isOverride = context.languageContext?.isExplicitOverride;

    let companyBrainSection = "";
    if (context.companyBrain) {
      const parts: string[] = [];
      if (context.companyBrain.businessIdentity) parts.push(`- **Business Identity / Positioning**: ${context.companyBrain.businessIdentity}`);
      if (context.companyBrain.targetAudience) parts.push(`- **Target Audience / ICP**: ${context.companyBrain.targetAudience}`);
      if (context.companyBrain.coreOffers) parts.push(`- **Core Offers & Services**: ${context.companyBrain.coreOffers}`);
      if (context.companyBrain.goalsAndPriorities) parts.push(`- **Strategic Goals & Priorities**: ${context.companyBrain.goalsAndPriorities}`);
      if (context.companyBrain.constraintsAndPreferences) parts.push(`- **Brand Tone & Operational Constraints**: ${context.companyBrain.constraintsAndPreferences}`);

      if (parts.length > 0) {
        companyBrainSection = `### Company Brain (Persistent Business Knowledge):\n${parts.join("\n")}\n\n`;
      }
    }

    let memorySection = "";
    if (context.memories && context.memories.length > 0) {
      memorySection =
        `### Relevant Organizational & Funnel Memory:\n` +
        context.memories
          .map((m) => `- [${m.category.toUpperCase()}] ${m.content}`)
          .join("\n") +
        "\n\n";
    }

    let funnelSection = "No specific funnel selected.";
    if (context.currentFunnel) {
      funnelSection =
        `Active Funnel: "${context.currentFunnel.name}" (Type: ${context.currentFunnel.funnelType})\n` +
        `- Goal: ${context.currentFunnel.goal || "N/A"}\n` +
        `- Target Audience: ${context.currentFunnel.targetAudience || "N/A"}\n` +
        `- Offer: ${context.currentFunnel.offer || "N/A"}\n` +
        `- Steps (${context.currentFunnel.stepCount}): ${
          context.currentFunnel.steps.map((s) => `${s.order}. ${s.name} (${s.type})`).join(" → ") || "None yet"
        }`;
      if (context.funnelMetrics) {
        funnelSection += `\n- Metrics: ${context.funnelMetrics.visitors} visitors, ${context.funnelMetrics.leads} leads, ${context.funnelMetrics.conversionRate}% conversion rate`;
      }
    }

    let pageSection = "No specific page selected.";
    if (context.currentPage) {
      pageSection =
        `Active Page: "${context.currentPage.name}" (Slug: /${context.currentPage.slug}, Type: ${context.currentPage.pageType})\n` +
        `- Status: ${context.currentPage.status}\n` +
        `- Sections (${context.currentPage.sectionCount}): ${context.currentPage.sectionTypes.join(", ") || "None yet"}`;
    }

    let langSection =
      "Respond directly in the user's language (zero English intermediary).\n" +
      "If the user speaks Malay, answer in professional Malay. If Chinese, answer in Chinese. If English, answer in English.";
    if (targetLang && targetLang !== "auto") {
      langSection += `\n- Active Target Response Language: "${targetLang.toUpperCase()}"${
        isOverride ? " (Explicit User Directive)" : ""
      }.`;
    }

    return (
      `You are ELMO, the intelligent conversational AI operating layer for an all-in-one funnel and marketing automation SaaS.\n\n` +
      `## 1. IDENTITY & AUTHORITY\n` +
      `- Human Superior: ${context.user.displayName} (Role: ${context.user.role})\n` +
      `- Organization: "${context.organization.name}" (Autonomy: ${context.organization.autonomyMode.toUpperCase()})\n` +
      `- Persona: Sophisticated, futuristic AI business strategist and operational assistant.\n\n` +
      `## 2. ACTIVE BUSINESS CONTEXT & COMPANY BRAIN\n` +
      `${companyBrainSection}` +
      `${memorySection}` +
      `### Funnel Context:\n${funnelSection}\n\n` +
      `### Page Context:\n${pageSection}\n\n` +
      `${context.currentTask ? `### Current Operational Task:\n${context.currentTask}\n\n` : ""}` +
      `## 3. CONVERSATIONAL BEHAVIOR\n` +
      `- Natural, contextual, adaptive communication.\n` +
      `- For greetings or casual conversation, be warm, direct, and conversational.\n` +
      `- For simple questions, give simple direct answers.\n` +
      `- For complex funnel or marketing strategy, provide structured, actionable executive plans informed by the Company Brain.\n` +
      `- NEVER claim an action is executed when it was only planned.\n` +
      `- CLEARLY distinguish between THINKING (planning) and EXECUTING (performing application actions).\n\n` +
      `## 4. MULTILINGUAL DIRECTIVE\n` +
      `${langSection}\n`
    );
  }
}
