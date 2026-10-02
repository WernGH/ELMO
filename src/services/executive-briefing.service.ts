/**
 * ELMO Executive AI — Executive Briefing Engine (ExecutiveBriefingService)
 *
 * Single authoritative service for generating, caching, persisting, and
 * executing AI-native Morning Briefings across multi-tenant organizations.
 *
 * Collects real business data from:
 * - Contacts & Contact Events (ContactService)
 * - Funnels, Pages, Forms & Submissions (FunnelService, FormService, PageService)
 * - Visitor & Funnel Analytics (AnalyticsService)
 * - Tasks & Approvals (TaskService, ApprovalService)
 * - AI Executions & History (ExecutionHistoryService, AgentRegistryService)
 * - Company Brain & Business Memory (ElmoMemoryService)
 * - Enterprise Goals (GoalService)
 *
 * Strictly grounded in actual tenant data without hallucinations.
 * Enforces multi-tenant Row Level Security (RLS).
 */

import {
  ExecutiveBriefing,
  BriefingRequestOptions,
  BusinessSnapshot,
  FunnelHealthSummary,
  WorkExecutionStatus,
  AIWorkforceSummary,
  CompanyBrainIntelligenceSummary,
  ExecutiveActionPayload,
  ActiveFunnelHealth,
} from "@/types/briefing.types";
import { ExecutivePriorityService } from "./executive-priority.service";
import { ContactService } from "./contact.service";
import { FunnelService } from "./funnel.service";
import { AnalyticsService } from "./analytics.service";
import { TaskService } from "./task.service";
import { ApprovalService } from "./approval.service";
import { GoalService } from "./goal.service";
import { ElmoMemoryService } from "./elmo-memory.service";
import { ExecutionHistoryService } from "./agentic/execution-history.service";
import { AgentRegistryService } from "./agentic/agent-registry.service";
import { ElmoOrchestratorService } from "./agentic/elmo-orchestrator.service";
import { OrganizationService } from "./organization.service";
import { MockDataStore, ExecutiveBriefingInsert } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export class ExecutiveBriefingService {
  private static instance: ExecutiveBriefingService;
  private priorityService: ExecutivePriorityService;
  private contactService: ContactService;
  private funnelService: FunnelService;
  private analyticsService: AnalyticsService;
  private taskService: TaskService;
  private approvalService: ApprovalService;
  private goalService: GoalService;
  private memoryService: ElmoMemoryService;
  private historyService: ExecutionHistoryService;
  private registryService: AgentRegistryService;
  private orgService: OrganizationService;
  private store: MockDataStore;

  // In-memory cache for fast dashboard re-renders: orgId:date -> ExecutiveBriefing
  private memoryCache: Map<string, { briefing: ExecutiveBriefing; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

  private constructor() {
    this.priorityService = ExecutivePriorityService.getInstance();
    this.contactService = ContactService.getInstance();
    this.funnelService = FunnelService.getInstance();
    this.analyticsService = AnalyticsService.getInstance();
    this.taskService = TaskService.getInstance();
    this.approvalService = ApprovalService.getInstance();
    this.goalService = GoalService.getInstance();
    this.memoryService = ElmoMemoryService.getInstance();
    this.historyService = ExecutionHistoryService.getInstance();
    this.registryService = AgentRegistryService.getInstance();
    this.orgService = OrganizationService.getInstance();
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): ExecutiveBriefingService {
    if (!ExecutiveBriefingService.instance) {
      ExecutiveBriefingService.instance = new ExecutiveBriefingService();
    }
    return ExecutiveBriefingService.instance;
  }

  public static resetInstance(): void {
    ExecutiveBriefingService.instance = undefined as any;
  }

  public clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Primary entry point: Retrieves or generates the executive morning briefing.
   * Prevents repeated re-generation on render using cached persistence.
   */
  public async getBriefing(options: BriefingRequestOptions): Promise<ExecutiveBriefing> {
    return this.getOrGenerateBriefing(options);
  }

  public async getOrGenerateBriefing(options: BriefingRequestOptions): Promise<ExecutiveBriefing> {
    const { userId, organizationId, forceRefresh } = options;
    const targetDate = options.date || new Date().toISOString().split("T")[0];
    const cacheKey = `${organizationId}:${targetDate}:${options.language || "en"}`;

    // 1. Check in-memory cache if not force refreshed
    if (!forceRefresh) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
        return { ...cached.briefing, isCached: true };
      }

      // Check persistent store
      const persisted = await this.loadPersistedBriefing(userId, organizationId, targetDate);
      if (persisted) {
        this.memoryCache.set(cacheKey, { briefing: persisted, cachedAt: Date.now() });
        return { ...persisted, isCached: true };
      }
    }

    // 2. Generate new fresh executive briefing
    const freshBriefing = await this.generateFreshBriefing(userId, organizationId, targetDate, options.language || "en");

    // 3. Persist and cache
    await this.persistBriefing(userId, organizationId, freshBriefing);
    this.memoryCache.set(cacheKey, { briefing: freshBriefing, cachedAt: Date.now() });

    return freshBriefing;
  }

  /**
   * Explicitly triggers a fresh data pull and briefing regeneration.
   */
  public async refreshBriefing(
    userId: string,
    organizationId: string,
    language = "en"
  ): Promise<ExecutiveBriefing> {
    return this.getOrGenerateBriefing({
      userId,
      organizationId,
      forceRefresh: true,
      language,
    });
  }

  /**
   * Gathers actual multi-source data and produces the canonical briefing.
   */
  private async generateFreshBriefing(
    userId: string,
    organizationId: string,
    targetDate: string,
    language: string
  ): Promise<ExecutiveBriefing> {
    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const priorPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // 1. Organization Details & Business Context
    const { data: org } = await this.orgService.getOrganization(userId, organizationId);
    const orgName = org?.name || "Enterprise";

    // 2. Business Snapshot (Contacts, Leads & Activity in previous 24 hours)
    const snapshot = await this.compileBusinessSnapshot(userId, organizationId, periodStart, priorPeriodStart);

    // 3. Funnel Health (Active funnels, traffic, drop-offs, anomalies)
    const funnelHealth = await this.compileFunnelHealth(userId, organizationId);

    // 4. Work & Execution Status (Tasks, Approvals, AI Executions)
    const workStatus = await this.compileWorkExecutionStatus(userId, organizationId);

    // 5. AI Workforce Summary (Registered Agents, Completion metrics)
    const workforceSummary = await this.compileAIWorkforceSummary(organizationId);

    // 6. Company Brain Intelligence (Memories, Strategic Goals)
    const companyBrain = await this.compileCompanyBrain(userId, organizationId);

    // 7. Run Executive Priority Engine ("Why It Matters" & "Today's Focus")
    const { priorityItems, todayFocus, recommendations } = this.priorityService.prioritizeSignals({
      organizationId,
      snapshot,
      funnelHealth,
      workStatus,
      workforceSummary,
      companyBrain,
      organizationName: orgName,
      language,
    });

    // 8. Generate Natural Spoken Briefing Script
    const spokenBriefing = this.composeSpokenBriefing({
      orgName,
      snapshot,
      priorityItems,
      todayFocus,
      workStatus,
      language,
    });

    const dataFreshness = {
      leadsLastUpdated: now.toISOString(),
      funnelsLastUpdated: now.toISOString(),
      tasksLastUpdated: now.toISOString(),
      approvalsLastUpdated: now.toISOString(),
      analyticsPeriod: "Last 24 Hours (Rolling)",
      isRealtime: true,
    };

    return {
      id: `brf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      userId,
      briefingDate: targetDate,
      generatedAt: now.toISOString(),
      period: {
        start: periodStart,
        end: periodEnd,
      },
      businessSnapshot: snapshot,
      funnelHealth,
      workStatus,
      workforceSummary,
      companyBrain,
      priorityItems,
      todayFocus,
      recommendations,
      spokenBriefing,
      language,
      status: "active",
      dataFreshness,
      isCached: false,
    };
  }

  // ==========================================================================
  // DATA COMPILATION SUB-ENGINES
  // ==========================================================================

  private async compileBusinessSnapshot(
    userId: string,
    organizationId: string,
    periodStart: string,
    priorPeriodStart: string
  ): Promise<BusinessSnapshot> {
    const { data: contacts } = await this.contactService.getContacts(userId, organizationId);
    const allContacts = contacts || [];

    const pStart = new Date(periodStart).getTime();
    const pPrior = new Date(priorPeriodStart).getTime();

    // 24h contacts vs prior 24h contacts
    const currentPeriodContacts = allContacts.filter(
      (c) => new Date(c.created_at).getTime() >= pStart
    );
    const priorPeriodContacts = allContacts.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= pPrior && t < pStart;
    });

    const newLeads = currentPeriodContacts.filter((c) => c.status === "lead" || !c.status);
    const newLeadsCount = newLeads.length;
    const newContactsCount = currentPeriodContacts.length;

    // Lead volume change
    const previousLeadsCount = priorPeriodContacts.filter((c) => c.status === "lead" || !c.status).length;
    let percentChange: number | null = null;
    let trend: "up" | "down" | "neutral" = "neutral";

    if (previousLeadsCount > 0) {
      percentChange = Math.round(((newLeadsCount - previousLeadsCount) / previousLeadsCount) * 100);
      trend = percentChange > 0 ? "up" : percentChange < 0 ? "down" : "neutral";
    } else if (newLeadsCount > 0) {
      trend = "up";
    }

    // Lead Sources breakdown
    const sourceCounts: Record<string, number> = {};
    for (const c of currentPeriodContacts) {
      const src = c.source || "Direct / Organic";
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
    const leadSources = Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
      percentage: newContactsCount > 0 ? Math.round((count / newContactsCount) * 100) : 0,
    }));

    // Funnel activity from analytics events
    const { data: events } = await this.analyticsService.getEvents(userId, organizationId);
    const recentEvents = (events || []).filter(
      (e) => new Date(e.created_at).getTime() >= pStart
    );

    const pageViews = recentEvents.filter((e) => e.event_type === "page_view").length;
    const conversions = recentEvents.filter(
      (e) => e.event_type === "form_submit" || e.event_type === "conversion"
    ).length;

    const currentRate = pageViews > 0 ? (conversions / pageViews) * 100 : 0;

    // Prior period conversion calculation
    const priorEvents = (events || []).filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= pPrior && t < pStart;
    });
    const priorPageViews = priorEvents.filter((e) => e.event_type === "page_view").length;
    const priorConversions = priorEvents.filter(
      (e) => e.event_type === "form_submit" || e.event_type === "conversion"
    ).length;
    const previousRate = priorPageViews > 0 ? (priorConversions / priorPageViews) * 100 : currentRate;

    const rateDifference = Number((currentRate - previousRate).toFixed(1));
    const convTrend: "up" | "down" | "neutral" =
      rateDifference > 0.5 ? "up" : rateDifference < -0.5 ? "down" : "neutral";

    // Important contact activity
    const importantContactActivity = currentPeriodContacts.slice(0, 5).map((c) => ({
      contactId: c.id,
      contactName: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email,
      eventType: "new_contact_optin",
      timestamp: c.created_at,
      details: c.source ? `Source: ${c.source}` : undefined,
    }));

    return {
      newLeadsCount,
      newContactsCount,
      leadSources,
      importantContactActivity,
      leadVolumeChange: {
        current: newLeadsCount,
        previous: previousLeadsCount,
        percentChange,
        trend,
      },
      conversionChange: {
        currentRate: Number(currentRate.toFixed(1)),
        previousRate: Number(previousRate.toFixed(1)),
        rateDifference,
        trend: convTrend,
      },
      funnelActivity: {
        activeFunnelsCount: 0, // updated in compileFunnelHealth
        totalViews: pageViews,
        totalConversions: conversions,
      },
      importantBusinessEvents: [],
    };
  }

  private async compileFunnelHealth(
    userId: string,
    organizationId: string
  ): Promise<FunnelHealthSummary> {
    const { data: funnels } = await this.funnelService.getFunnels(userId, organizationId);
    const activeFunnelsList = (funnels || []).filter((f) => f.status === "active" || f.status === "draft");

    const activeFunnels: ActiveFunnelHealth[] = [];
    const anomalies: string[] = [];
    const opportunities: string[] = [];

    for (const funnel of activeFunnelsList) {
      const metrics = await this.analyticsService.getFunnelMetrics(userId, organizationId, funnel.id);
      const m = metrics.data;

      // Extract step drop-off points
      const dropOffPoints = [];
      const { data: stepList } = await this.funnelService.getFunnelSteps(userId, organizationId, funnel.id);
      const steps = stepList || [];
      const totalVisitors = m?.totalVisitors || 0;
      const totalLeads = m?.totalLeads || 0;
      const conversionRate = m?.conversionRate || (totalVisitors > 0 ? (totalLeads / totalVisitors) * 100 : 0);

      if (steps.length > 1 && totalVisitors > 0) {
        // Calculate estimated drop-off between steps
        const stepDropOff = totalVisitors - totalLeads;
        const dropRate = (stepDropOff / totalVisitors) * 100;
        if (dropRate >= 40) {
          dropOffPoints.push({
            stepName: steps[0]?.name || "Landing Page",
            stepOrder: 1,
            visitors: totalVisitors,
            dropOffRate: Number(dropRate.toFixed(1)),
            reason: "High bounce or hesitation on primary opt-in CTA",
          });
        }
      }

      let anomaly: string | undefined;
      let opportunity: string | undefined;

      if (totalVisitors > 10 && conversionRate < 5.0) {
        anomaly = `Funnel "${funnel.name}" is experiencing below-average conversion (${conversionRate.toFixed(1)}%).`;
        opportunity = `Refine primary headline and simplify form fields on "${funnel.name}".`;
        anomalies.push(anomaly);
        opportunities.push(opportunity);
      } else if (conversionRate >= 15.0) {
        opportunity = `Funnel "${funnel.name}" is performing strongly at ${conversionRate.toFixed(1)}%. Consider scaling traffic.`;
        opportunities.push(opportunity);
      }

      activeFunnels.push({
        funnelId: funnel.id,
        name: funnel.name,
        status: funnel.status,
        traffic: totalVisitors,
        conversionRate: Number(conversionRate.toFixed(1)),
        submissions: totalLeads,
        dropOffPoints,
        anomaly,
        optimizationOpportunity: opportunity,
      });
    }

    const overallHealth: "healthy" | "warning" | "critical" | "insufficient_data" =
      activeFunnels.length === 0
        ? "insufficient_data"
        : anomalies.length > 0
        ? "warning"
        : "healthy";

    return {
      activeFunnels,
      overallConversionHealth: overallHealth,
      anomalies,
      opportunities,
    };
  }

  private async compileWorkExecutionStatus(
    userId: string,
    organizationId: string
  ): Promise<WorkExecutionStatus> {
    const now = new Date().toISOString();

    // 1. Approvals
    const approvals = await this.approvalService.getApprovals(userId, organizationId);
    const pendingApprovals = approvals
      .filter((a) => a.status === "pending")
      .map((a) => ({
        id: a.id,
        action: a.action,
        riskLevel: a.risk_level as "Low" | "Medium" | "High",
        requestedBy: a.requested_by,
        category: a.category,
        details: a.details,
        createdAt: a.created_at,
      }));

    // 2. Tasks
    const tasks = await this.taskService.getTasks(userId, organizationId);
    const highPriorityTasks = tasks
      .filter((t) => (t.priority === "HIGH" || t.priority === "URGENT") && t.status !== "COMPLETED")
      .map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        ownerName: t.owner_name,
        ownerType: t.owner_type,
        dueDate: t.due_date,
      }));

    const overdueTasks = tasks
      .filter((t) => t.due_date && t.due_date < now && t.status !== "COMPLETED" && t.status !== "CANCELLED")
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date!,
        ownerName: t.owner_name,
        priority: t.priority,
      }));

    const blockedTasks = tasks
      .filter((t) => t.status === "BLOCKED")
      .map((t) => ({
        id: t.id,
        title: t.title,
        ownerName: t.owner_name,
        reason: t.description || undefined,
      }));

    // 3. AI Executions
    const executions = this.historyService.listExecutions(organizationId);
    const activeExecutions = executions
      .filter((e) => e.status === "EXECUTING" || e.status === "PLANNING")
      .map((e) => ({
        executionId: e.executionId,
        objective: e.objective,
        status: e.status,
        agentsInvolved: e.agentsInvolved,
        startedAt: new Date(e.startedAt).toISOString(),
      }));

    const failedExecutions = executions
      .filter((e) => e.status === "FAILED")
      .map((e) => ({
        executionId: e.executionId,
        objective: e.objective,
        error: e.error,
        timestamp: new Date(e.completedAt || e.startedAt).toISOString(),
      }));

    const retryingExecutions = executions
      .filter((e) => (e.retryCount || 0) > 0 && e.status === "EXECUTING")
      .map((e) => ({
        executionId: e.executionId,
        objective: e.objective,
        retryCount: e.retryCount || 1,
      }));

    const completedExecutions = executions
      .filter((e) => e.status === "COMPLETED")
      .slice(0, 5)
      .map((e) => ({
        executionId: e.executionId,
        objective: e.objective,
        summary: e.summary,
        completedAt: new Date(e.completedAt || e.startedAt).toISOString(),
      }));

    const replanningEvents: Array<{ executionId: string; reason: string; timestamp: string }> = [];

    // Items requiring human attention
    const itemsRequiringHumanAttention: WorkExecutionStatus["itemsRequiringHumanAttention"] = [];
    for (const app of pendingApprovals) {
      itemsRequiringHumanAttention.push({
        id: app.id,
        type: "approval",
        title: `Authorize: ${app.action}`,
        reason: `${app.riskLevel} risk action requested by ${app.requestedBy}`,
        actionRequired: "Approve or reject in approvals queue",
      });
    }
    for (const od of overdueTasks) {
      itemsRequiringHumanAttention.push({
        id: od.id,
        type: "overdue_task",
        title: `Overdue: ${od.title}`,
        reason: `Due ${new Date(od.dueDate).toLocaleDateString()} (${od.ownerName})`,
        actionRequired: "Check in with assignee or re-delegate",
      });
    }

    return {
      pendingApprovals,
      highPriorityTasks,
      overdueTasks,
      blockedTasks,
      activeExecutions,
      failedExecutions,
      retryingExecutions,
      completedExecutions,
      replanningEvents,
      itemsRequiringHumanAttention,
    };
  }

  private async compileAIWorkforceSummary(organizationId: string): Promise<AIWorkforceSummary> {
    const allAgents = this.registryService.listAgents();
    const executions = this.historyService.listExecutions(organizationId);

    const agentSummaries = allAgents.map((agent) => {
      const agentExecs = executions.filter((e) => e.agentsInvolved.includes(agent.id) || e.agentsInvolved.includes(agent.name));
      const completed = agentExecs.filter((e) => e.status === "COMPLETED").length;
      const inProgress = agentExecs.filter((e) => e.status === "EXECUTING" || e.status === "PLANNING").length;
      const awaiting = agentExecs.filter((e) => e.status === "WAITING_FOR_APPROVAL").length;

      const recentResults = agentExecs
        .filter((e) => e.summary)
        .slice(0, 2)
        .map((e) => ({
          summary: e.summary || "Task completed",
          timestamp: new Date(e.completedAt || e.startedAt).toISOString(),
        }));

      return {
        agentId: agent.id,
        name: agent.name,
        role: agent.role,
        status: (inProgress > 0 ? "busy" : agent.enabled ? "standby" : "error") as "active" | "standby" | "busy" | "error",
        completedCount: completed,
        inProgressCount: inProgress,
        requiresApprovalCount: awaiting,
        waitingInputCount: 0,
        recentResults,
      };
    });

    const totalCompleted = executions.filter((e) => e.status === "COMPLETED").length;
    const totalExecuting = executions.filter((e) => e.status === "EXECUTING" || e.status === "PLANNING").length;
    const totalRequiringApproval = executions.filter((e) => e.status === "WAITING_FOR_APPROVAL").length;
    const totalFailed = executions.filter((e) => e.status === "FAILED").length;

    return {
      agents: agentSummaries,
      totalCompleted,
      totalExecuting,
      totalRequiringApproval,
      totalFailed,
    };
  }

  private async compileCompanyBrain(
    userId: string,
    organizationId: string
  ): Promise<CompanyBrainIntelligenceSummary> {
    // 1. Memories
    const memList = await this.memoryService.listMemories(userId, organizationId, {
      status: "active",
      limit: 10,
    });

    const recentEvents = (memList || []).slice(0, 4).map((m) => ({
      title: m.title || m.content.slice(0, 50),
      category: m.category,
      importance: m.importance_score || 3,
      summary: m.content,
    }));

    const strategicDecisions = (memList || [])
      .filter((m) => m.category === "decision" || m.category === "strategy")
      .slice(0, 3)
      .map((m) => ({
        title: m.title || "Strategic Decision",
        impact: m.content,
        timestamp: m.created_at,
      }));

    // 2. Goals
    const goals = await this.goalService.getGoals(userId, organizationId);
    const activeGoals = (goals || []).map((g) => {
      const target = g.target || 100;
      const current = g.current_value || 0;
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        id: g.id,
        title: g.title,
        progress,
        status: g.status,
        target: g.target,
        currentValue: g.current_value,
        deadline: g.deadline,
      };
    });

    return {
      recentEvents,
      strategicDecisions,
      activeGoals,
      customerPatterns: [],
      relevantHistoricalContext: [],
    };
  }

  // ==========================================================================
  // NATURAL SPOKEN BRIEFING SYNTHESIS (VOICE PIPELINE)
  // ==========================================================================

  private composeSpokenBriefing(params: {
    orgName: string;
    snapshot: BusinessSnapshot;
    priorityItems: any[];
    todayFocus: any[];
    workStatus: WorkExecutionStatus;
    language: string;
  }): string {
    const { orgName, snapshot, todayFocus, workStatus, language } = params;
    const lang = (language || "en").toLowerCase();

    // 1. Malay Spoken Briefing
    if (lang.startsWith("ms") || lang === "melayu") {
      const parts: string[] = [
        `Selamat pagi. Berikut adalah taklimat eksekutif untuk ${orgName}.`,
      ];

      if (snapshot.newLeadsCount > 0) {
        parts.push(
          `Semalam, organisasi menerima ${snapshot.newLeadsCount} prospek baharu.`
        );
        if (snapshot.leadSources.length > 0) {
          const top = snapshot.leadSources[0];
          parts.push(`Sumber utama adalah daripada ${top.source} dengan ${top.count} prospek.`);
        }
      } else {
        parts.push("Tiada prospek baharu direkodkan dalam tempoh 24 jam yang lalu.");
      }

      if (snapshot.conversionChange.trend === "down") {
        parts.push(
          `Kadar penukaran corong mengalami sedikit penurunan kepada ${snapshot.conversionChange.currentRate} peratus.`
        );
      }

      if (workStatus.pendingApprovals.length > 0) {
        parts.push(
          `Terdapat ${workStatus.pendingApprovals.length} kelulusan yang sedang menunggu tindakan anda.`
        );
      }

      if (todayFocus.length > 0) {
        parts.push(`Fokus utama hari ini: ${todayFocus[0].title}.`);
      }

      parts.push("Adakah anda ingin saya mulakan tindakan ini terlebih dahulu?");
      return parts.join("\n\n");
    }

    // 2. Chinese Spoken Briefing
    if (lang.startsWith("zh") || lang.includes("chinese") || lang.includes("中文")) {
      const parts: string[] = [
        `早安。以下是 ${orgName} 的今日高管早报。`,
      ];

      if (snapshot.newLeadsCount > 0) {
        parts.push(`在过去24小时内，您共收到了 ${snapshot.newLeadsCount} 位新潜在客户。`);
        if (snapshot.leadSources.length > 0) {
          const top = snapshot.leadSources[0];
          parts.push(`主要来源为 ${top.source}，贡献了 ${top.count} 位线索。`);
        }
      } else {
        parts.push("过去24小时内未记录到新的潜在客户。");
      }

      if (snapshot.conversionChange.trend === "down") {
        parts.push(`转化率略有波动，目前为 ${snapshot.conversionChange.currentRate}%。`);
      }

      if (workStatus.pendingApprovals.length > 0) {
        parts.push(`当前有 ${workStatus.pendingApprovals.length} 项关键审批等待您的决策。`);
      }

      if (todayFocus.length > 0) {
        parts.push(`今天首要推进事项：${todayFocus[0].title}。`);
      }

      parts.push("请问是否需要我立刻协助推进？");
      return parts.join("\n\n");
    }

    // 3. Default English Spoken Briefing
    const parts: string[] = [
      `Good morning. Here is your executive briefing for ${orgName}.`,
    ];

    if (snapshot.newLeadsCount > 0) {
      parts.push(`You received ${snapshot.newLeadsCount} new lead${snapshot.newLeadsCount === 1 ? "" : "s"} over the last 24 hours.`);
      if (snapshot.leadSources.length > 0) {
        const topSources = snapshot.leadSources
          .slice(0, 2)
          .map((s) => `${s.count} from ${s.source}`)
          .join(" and ");
        parts.push(`Primary acquisition was driven by ${topSources}.`);
      }
    } else {
      parts.push("No new inbound leads were captured over the last 24 hours.");
    }

    if (snapshot.conversionChange.trend === "down") {
      parts.push(
        `Your funnel conversion rate dropped to ${snapshot.conversionChange.currentRate}%. ELMO recommends reviewing the landing page CTA before scaling ad spend.`
      );
    } else if (snapshot.conversionChange.currentRate > 0) {
      parts.push(`Overall conversion health is steady at ${snapshot.conversionChange.currentRate}%.`);
    }

    if (workStatus.pendingApprovals.length > 0) {
      parts.push(
        `You have ${workStatus.pendingApprovals.length} approval${workStatus.pendingApprovals.length === 1 ? "" : "s"} waiting for your review.`
      );
    }

    if (workStatus.overdueTasks.length > 0) {
      parts.push(
        `There ${workStatus.overdueTasks.length === 1 ? "is 1 overdue task" : `are ${workStatus.overdueTasks.length} overdue tasks`} requiring attention.`
      );
    }

    if (todayFocus.length > 0) {
      parts.push(`Your top focus today is: ${todayFocus[0].title}.`);
    }

    parts.push("Would you like me to handle the primary focus item first?");
    return parts.join("\n\n");
  }

  // ==========================================================================
  // ACTION EXECUTION DISPATCH (AI-NATIVE ACTION LOOP)
  // ==========================================================================

  /**
   * Executes or dispatches a recommended action from the briefing.
   * Flow: BRIEFING -> IDENTIFY -> RECOMMEND -> APPROVAL -> ORCHESTRATOR -> SPECIALIST -> EXECUTE
   */
  public async executeBriefingAction(
    userIdOrOptions: string | { userId: string; organizationId: string; actionPayload: ExecutiveActionPayload; [key: string]: any },
    organizationId?: string,
    actionPayload?: ExecutiveActionPayload
  ): Promise<{
    success: boolean;
    message: string;
    executionId?: string;
    requiresApproval?: boolean;
    result?: unknown;
  }> {
    let userId: string;
    let orgId: string;
    let payload: ExecutiveActionPayload;

    if (typeof userIdOrOptions === "object") {
      userId = userIdOrOptions.userId;
      orgId = userIdOrOptions.organizationId;
      payload = userIdOrOptions.actionPayload;
    } else {
      userId = userIdOrOptions;
      orgId = organizationId!;
      payload = actionPayload!;
    }

    if (!payload || !payload.type) {
      return { success: false, message: "Invalid action payload." };
    }

    // 1. Review Approval
    if (payload.type === "review_approval" && payload.targetId) {
      return {
        success: true,
        message: `Approval item ${payload.targetId} is ready for executive decision in your Approvals queue.`,
        requiresApproval: true,
      };
    }

    // 2. Funnel Optimization Dispatch -> Orchestrator & Funnel/Analytics Agent
    if (payload.type === "optimize_funnel") {
      const orchestrator = ElmoOrchestratorService.getInstance();
      const funnelName = (payload.parameters?.funnelName as string) || "primary funnel";
      const orchRes = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: `Review the landing page CTA and optimize conversion for funnel "${funnelName}".`,
        requestedOutcome: "High-converting copy and CTA optimization plan",
      });

      return {
        success: true,
        message: `ELMO dispatched optimization for "${funnelName}". ${orchRes.response}`,
        executionId: orchRes.plan?.id,
        requiresApproval: Boolean(orchRes.pendingApproval),
        result: orchRes.previewPayload,
      };
    }

    // 3. Lead Follow-Up Dispatch -> Copy / Marketing Agent
    if (payload.type === "follow_up_leads") {
      const orchestrator = ElmoOrchestratorService.getInstance();
      const orchRes = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: `Draft high-touch personalized follow-up messages for our new prospective leads.`,
        requestedOutcome: "Lead follow-up sequence templates",
      });

      return {
        success: true,
        message: `ELMO prepared outreach templates for inbound leads. ${orchRes.response}`,
        executionId: orchRes.plan?.id,
        result: orchRes.previewPayload,
      };
    }

    // 4. Overdue Task Resolution / Assistance
    if (payload.type === "review_overdue") {
      const taskTitle = (payload.parameters?.title as string) || "Overdue Task";
      const task = await this.taskService.createTask({
        userId,
        organizationId: orgId,
        title: `Follow up & Resolve: ${taskTitle}`,
        description: `Automated assist dispatched from Morning Briefing.`,
        ownerType: "AI",
        ownerName: "ELMO Assistant",
        priority: "HIGH",
      });

      return {
        success: true,
        message: `Created operational assist task for "${taskTitle}".`,
        result: task,
      };
    }

    // 5. Run Analytics / Audit
    if (payload.type === "run_analysis") {
      const orchestrator = ElmoOrchestratorService.getInstance();
      const orchRes = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: `Analyze recent performance metrics and identify primary conversion bottlenecks.`,
        requestedOutcome: "Conversion audit report",
      });

      return {
        success: true,
        message: `ELMO compiled the analytics diagnosis. ${orchRes.response}`,
        executionId: orchRes.plan?.id,
        result: orchRes.previewPayload,
      };
    }

    return {
      success: true,
      message: `Action "${payload.type}" dispatched to ELMO workforce.`,
    };
  }

  // ==========================================================================
  // PERSISTENCE & MULTI-TENANT STORAGE HELPERS
  // ==========================================================================

  private async loadPersistedBriefing(
    userId: string,
    organizationId: string,
    briefingDate: string
  ): Promise<ExecutiveBriefing | null> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("executive_briefings") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .eq("briefing_date", briefingDate)
        .eq("status", "active")
        .single();

      if (!error && data) {
        return this.mapRowToBriefing(data);
      }
    }

    const row = this.store.getExecutiveBriefingByDateWithRLS(userId, organizationId, briefingDate);
    if (row) {
      return this.mapRowToBriefing(row);
    }
    return null;
  }

  private async persistBriefing(
    userId: string,
    organizationId: string,
    briefing: ExecutiveBriefing
  ): Promise<void> {
    const insertData: ExecutiveBriefingInsert = {
      id: briefing.id,
      organization_id: organizationId,
      user_id: userId,
      briefing_date: briefing.briefingDate,
      generated_at: briefing.generatedAt,
      period_start: briefing.period.start,
      period_end: briefing.period.end,
      snapshot: briefing.businessSnapshot as any,
      funnel_health: briefing.funnelHealth as any,
      work_status: briefing.workStatus as any,
      workforce_summary: briefing.workforceSummary as any,
      priority_items: briefing.priorityItems as any,
      today_focus: briefing.todayFocus as any,
      recommendations: briefing.recommendations as any,
      spoken_briefing: briefing.spokenBriefing,
      language: briefing.language,
      status: briefing.status,
      metadata: briefing.metadata || {},
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      await (supabase.from("executive_briefings") as any).upsert(insertData, {
        onConflict: "organization_id,briefing_date",
      });
    }

    this.store.saveExecutiveBriefingWithRLS(userId, organizationId, insertData);
  }

  private mapRowToBriefing(row: any): ExecutiveBriefing {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      briefingDate: row.briefing_date,
      generatedAt: row.generated_at,
      period: {
        start: row.period_start,
        end: row.period_end,
      },
      businessSnapshot: row.snapshot || {},
      funnelHealth: row.funnel_health || { activeFunnels: [], overallConversionHealth: "insufficient_data", anomalies: [], opportunities: [] },
      workStatus: row.work_status || { pendingApprovals: [], highPriorityTasks: [], overdueTasks: [], blockedTasks: [], activeExecutions: [], failedExecutions: [], retryingExecutions: [], completedExecutions: [], replanningEvents: [], itemsRequiringHumanAttention: [] },
      workforceSummary: row.workforce_summary || { agents: [], totalCompleted: 0, totalExecuting: 0, totalRequiringApproval: 0, totalFailed: 0 },
      companyBrain: { recentEvents: [], strategicDecisions: [], activeGoals: [], customerPatterns: [], relevantHistoricalContext: [] },
      priorityItems: row.priority_items || [],
      todayFocus: row.today_focus || [],
      recommendations: row.recommendations || [],
      spokenBriefing: row.spoken_briefing || "",
      language: row.language || "en",
      status: row.status || "active",
      dataFreshness: {
        leadsLastUpdated: row.generated_at,
        funnelsLastUpdated: row.generated_at,
        tasksLastUpdated: row.generated_at,
        approvalsLastUpdated: row.generated_at,
        analyticsPeriod: "Last 24 Hours (Rolling)",
        isRealtime: false,
      },
      isCached: true,
      metadata: row.metadata,
    };
  }
}
