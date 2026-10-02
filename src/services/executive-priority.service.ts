/**
 * ELMO Executive AI — Executive Priority Engine (ExecutivePriorityService)
 *
 * Evaluates real business signals across contacts, funnels, tasks, approvals,
 * agent executions, goals, and memory to determine what truly matters.
 *
 * Implements the canonical "Why It Matters" 3-part framework:
 * 1. "What Happened?" (Fact)
 * 2. "Why Does It Matter?" (Analysis)
 * 3. "What Should Happen Next?" (Recommendation)
 *
 * Industry-agnostic, strictly grounded in actual data without arbitrary scoring.
 */

import {
  ExecutivePriorityItem,
  TodayFocusItem,
  ElmoRecommendation,
  BusinessSnapshot,
  FunnelHealthSummary,
  WorkExecutionStatus,
  AIWorkforceSummary,
  CompanyBrainIntelligenceSummary,
} from "@/types/briefing.types";

export interface PrioritizeSignalsInput {
  organizationId: string;
  snapshot: BusinessSnapshot;
  funnelHealth: FunnelHealthSummary;
  workStatus: WorkExecutionStatus;
  workforceSummary: AIWorkforceSummary;
  companyBrain: CompanyBrainIntelligenceSummary;
  organizationName?: string;
  language?: string;
}

export interface PrioritizeSignalsOutput {
  priorityItems: ExecutivePriorityItem[];
  todayFocus: TodayFocusItem[];
  recommendations: ElmoRecommendation[];
}

export class ExecutivePriorityService {
  private static instance: ExecutivePriorityService;

  private constructor() {}

  public static getInstance(): ExecutivePriorityService {
    if (!ExecutivePriorityService.instance) {
      ExecutivePriorityService.instance = new ExecutivePriorityService();
    }
    return ExecutivePriorityService.instance;
  }

  public evaluatePriorityItems(input: {
    organizationName?: string;
    businessSnapshot?: BusinessSnapshot;
    snapshot?: BusinessSnapshot;
    funnelHealth: FunnelHealthSummary;
    workStatus: WorkExecutionStatus;
    workforceSummary: AIWorkforceSummary;
    companyBrain: CompanyBrainIntelligenceSummary;
    organizationId?: string;
    language?: string;
  }): ExecutivePriorityItem[] {
    const result = this.prioritizeSignals({
      organizationId: input.organizationId || "00000000-0000-0000-0000-000000000000",
      snapshot: input.businessSnapshot || input.snapshot!,
      funnelHealth: input.funnelHealth,
      workStatus: input.workStatus,
      workforceSummary: input.workforceSummary,
      companyBrain: input.companyBrain,
      organizationName: input.organizationName,
      language: input.language,
    });
    return result.priorityItems;
  }

  public prioritizeSignals(input: PrioritizeSignalsInput): PrioritizeSignalsOutput {
    const items: ExecutivePriorityItem[] = [];
    const now = Date.now();

    // ------------------------------------------------------------------------
    // 1. Pending Human Approvals (Highest Governance Impact)
    // ------------------------------------------------------------------------
    for (const approval of input.workStatus.pendingApprovals) {
      items.push({
        id: `pri-approval-${approval.id}`,
        priority: approval.riskLevel === "High" ? "urgent" : "high",
        category: "ATTENTION_REQUIRED",
        severity: approval.riskLevel === "High" ? "critical" : "warning",
        businessImpact: `Execution of "${approval.action}" is paused awaiting executive authorization.`,
        source: "ApprovalService",
        timestamp: new Date(approval.createdAt).getTime(),
        whatHappened: `Action "${approval.action}" requested by ${approval.requestedBy} requires human approval (${approval.riskLevel} risk).`,
        whyItMatters:
          "Autonomous agent execution remains paused until an authorized decision is made. Delaying approval blocks dependent workflow steps.",
        recommendedAction: `Review and decide on the approval request for "${approval.action}".`,
        requiresApproval: true,
        actionPayload: {
          type: "review_approval",
          targetId: approval.id,
          parameters: { action: approval.action, riskLevel: approval.riskLevel },
        },
      });
    }

    // ------------------------------------------------------------------------
    // 2. Failed or Retrying AI Executions
    // ------------------------------------------------------------------------
    for (const failed of input.workStatus.failedExecutions) {
      items.push({
        id: `pri-exec-failed-${failed.executionId}`,
        priority: "high",
        category: "ATTENTION_REQUIRED",
        severity: "critical",
        businessImpact: `AI task "${failed.objective}" encountered an execution fault.`,
        source: "ExecutionHistoryService",
        timestamp: new Date(failed.timestamp).getTime(),
        whatHappened: `AI execution "${failed.objective}" halted due to an error${failed.error ? `: ${failed.error}` : "."}`,
        whyItMatters:
          "The expected deliverable was not produced, which may disrupt downstream operations or marketing assets.",
        recommendedAction: "Diagnose execution log, inspect dependencies, or re-run with adjusted parameters.",
        requiresApproval: false,
        actionPayload: {
          type: "run_analysis",
          targetId: failed.executionId,
          parameters: { objective: failed.objective },
        },
      });
    }

    // ------------------------------------------------------------------------
    // 3. Funnel Health: Conversion Declines, Drop-Offs & Anomalies
    // ------------------------------------------------------------------------
    for (const funnel of input.funnelHealth.activeFunnels) {
      if (funnel.anomaly || (funnel.dropOffPoints && funnel.dropOffPoints.length > 0)) {
        const primaryDropOff = funnel.dropOffPoints?.[0];
        const isCritical = primaryDropOff && primaryDropOff.dropOffRate >= 60;
        
        items.push({
          id: `pri-funnel-${funnel.funnelId}`,
          priority: isCritical ? "high" : "medium",
          category: isCritical ? "ATTENTION_REQUIRED" : "WATCH",
          severity: isCritical ? "warning" : "info",
          businessImpact: `Funnel "${funnel.name}" is dropping ${primaryDropOff ? `${primaryDropOff.dropOffRate.toFixed(1)}% of visitors at ${primaryDropOff.stepName}` : "traffic before conversion"}.`,
          source: "FunnelService",
          timestamp: now,
          whatHappened: funnel.anomaly || `Visitors are entering "${funnel.name}", but conversion is at ${funnel.conversionRate.toFixed(1)}% with high drop-off at ${primaryDropOff ? primaryDropOff.stepName : "opt-in stage"}.`,
          whyItMatters:
            "Traffic is being driven to the funnel, but friction or misalignment is causing prospective customers to abandon before taking action, reducing return on marketing spend.",
          recommendedAction:
            funnel.optimizationOpportunity ||
            `Review the headline, CTA, and form experience on "${funnel.name}" to remove conversion friction.`,
          requiresApproval: false,
          actionPayload: {
            type: "optimize_funnel",
            targetId: funnel.funnelId,
            parameters: { funnelName: funnel.name, conversionRate: funnel.conversionRate },
          },
        });
      }
    }

    // Conversion rate delta across all activity
    if (
      input.snapshot.conversionChange.trend === "down" &&
      Math.abs(input.snapshot.conversionChange.rateDifference) >= 2.0
    ) {
      items.push({
        id: `pri-conversion-drop-${now}`,
        priority: "high",
        category: "ATTENTION_REQUIRED",
        severity: "warning",
        businessImpact: `Overall conversion rate declined by ${Math.abs(input.snapshot.conversionChange.rateDifference).toFixed(1)}% compared to the prior period.`,
        source: "AnalyticsService",
        timestamp: now,
        whatHappened: `Conversion rate changed from ${input.snapshot.conversionChange.previousRate.toFixed(1)}% to ${input.snapshot.conversionChange.currentRate.toFixed(1)}%.`,
        whyItMatters:
          "Fewer prospects are converting into leads or customers per visit. If acquisition volume stays constant, new pipeline will contract.",
        recommendedAction: "Conduct an analytics audit across primary landing pages and test alternative copy angles.",
        requiresApproval: false,
        actionPayload: {
          type: "run_analysis",
          parameters: { metric: "conversion_rate", diff: input.snapshot.conversionChange.rateDifference },
        },
      });
    }

    // ------------------------------------------------------------------------
    // 4. Overdue or Blocked Operational Tasks
    // ------------------------------------------------------------------------
    for (const overdue of input.workStatus.overdueTasks) {
      items.push({
        id: `pri-task-overdue-${overdue.id}`,
        priority: overdue.priority === "URGENT" || overdue.priority === "HIGH" ? "high" : "medium",
        category: "ATTENTION_REQUIRED",
        severity: "warning",
        businessImpact: `Task "${overdue.title}" assigned to ${overdue.ownerName} is overdue since ${new Date(overdue.dueDate).toLocaleDateString()}.`,
        source: "TaskService",
        timestamp: new Date(overdue.dueDate).getTime(),
        whatHappened: `Task "${overdue.title}" passed its targeted due date without completion.`,
        whyItMatters:
          "Unfinished tasks accumulate operational debt, stall dependent workflows, and jeopardize sprint milestones.",
        recommendedAction: `Check in on task status with ${overdue.ownerName} or have ELMO assist in completing it.`,
        requiresApproval: false,
        actionPayload: {
          type: "review_overdue",
          targetId: overdue.id,
          parameters: { title: overdue.title, owner: overdue.ownerName },
        },
      });
    }

    for (const blocked of input.workStatus.blockedTasks) {
      items.push({
        id: `pri-task-blocked-${blocked.id}`,
        priority: "high",
        category: "ATTENTION_REQUIRED",
        severity: "warning",
        businessImpact: `Task "${blocked.title}" is blocked${blocked.reason ? `: ${blocked.reason}` : ""}.`,
        source: "TaskService",
        timestamp: now,
        whatHappened: `Task "${blocked.title}" has been flagged as BLOCKED.`,
        whyItMatters: "Progress is stalled and team/agent effort cannot advance until the dependency is resolved.",
        recommendedAction: `Review the blocking dependency for "${blocked.title}" and unblock resources.`,
        requiresApproval: false,
        actionPayload: {
          type: "create_task",
          targetId: blocked.id,
          parameters: { title: `Unblock: ${blocked.title}` },
        },
      });
    }

    // ------------------------------------------------------------------------
    // 5. New High-Intent Leads & Inbound Pipeline Momentum
    // ------------------------------------------------------------------------
    if (input.snapshot.newLeadsCount > 0) {
      const topSources = input.snapshot.leadSources
        .slice(0, 2)
        .map((s) => `${s.count} from ${s.source}`)
        .join(", ");

      items.push({
        id: `pri-new-leads-${now}`,
        priority: input.snapshot.newLeadsCount >= 5 ? "high" : "medium",
        category: "OPPORTUNITY",
        severity: "info",
        businessImpact: `Received ${input.snapshot.newLeadsCount} new qualified leads (${topSources || "direct traffic"}).`,
        source: "ContactService",
        timestamp: now,
        whatHappened: `${input.snapshot.newLeadsCount} new contact${input.snapshot.newLeadsCount === 1 ? "" : "s"} entered the pipeline during the last 24 hours.`,
        whyItMatters:
          "Fast response times directly correlate with lead qualification rates. Inbound interest decays sharply after the first 24 hours.",
        recommendedAction:
          "Review new contacts, verify lead scoring, and ensure automated or personal follow-up has been dispatched.",
        requiresApproval: false,
        actionPayload: {
          type: "follow_up_leads",
          parameters: { count: input.snapshot.newLeadsCount },
        },
      });
    }

    // ------------------------------------------------------------------------
    // 6. Positive Execution Milestones & Completed Work
    // ------------------------------------------------------------------------
    for (const completed of input.workStatus.completedExecutions.slice(0, 2)) {
      items.push({
        id: `pri-exec-completed-${completed.executionId}`,
        priority: "low",
        category: "POSITIVE_RESULT",
        severity: "info",
        businessImpact: `Autonomous delivery complete: "${completed.objective}".`,
        source: "ExecutionHistoryService",
        timestamp: new Date(completed.completedAt).getTime(),
        whatHappened: `AI workforce successfully executed "${completed.objective}".`,
        whyItMatters: "Operational objectives are moving forward without requiring manual human effort.",
        recommendedAction: "Review completed deliverable and monitor operational impact.",
        requiresApproval: false,
      });
    }

    // ------------------------------------------------------------------------
    // 7. Goals on Track or Behind Schedule
    // ------------------------------------------------------------------------
    for (const goal of input.companyBrain.activeGoals) {
      if (goal.status === "BEHIND") {
        items.push({
          id: `pri-goal-behind-${goal.id}`,
          priority: "medium",
          category: "WATCH",
          severity: "warning",
          businessImpact: `Goal "${goal.title}" is tracking behind schedule (progress: ${goal.progress}%).`,
          source: "GoalService",
          timestamp: now,
          whatHappened: `Goal "${goal.title}" progress is below expected pacing towards target.`,
          whyItMatters: "Without tactical acceleration or workload reallocation, the quarterly target may be missed.",
          recommendedAction: `Deploy specialist agents to accelerate supporting tasks for "${goal.title}".`,
          requiresApproval: false,
          actionPayload: {
            type: "create_task",
            targetId: goal.id,
            parameters: { goalTitle: goal.title },
          },
        });
      }
    }

    // Default informative item if zero items exist
    if (items.length === 0) {
      items.push({
        id: `pri-info-stable-${now}`,
        priority: "low",
        category: "INFORMATION",
        severity: "info",
        businessImpact: "All business systems and operational pipelines are operating normally.",
        source: "ELMOIntelligence",
        timestamp: now,
        whatHappened: "No anomalies, critical alerts, or blocked executions detected in the past 24 hours.",
        whyItMatters: "Foundation is steady and workforce agents are standing by for strategic initiatives.",
        recommendedAction: "Explore new customer acquisition angles or review upcoming sprint goals.",
        requiresApproval: false,
      });
    }

    // Sort items by priority rank
    const priorityOrder: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    items.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

    // ------------------------------------------------------------------------
    // Construct "Today's Focus" (Top 3 - 5 dynamic action priorities)
    // ------------------------------------------------------------------------
    const todayFocus: TodayFocusItem[] = items
      .filter((item) => item.category !== "POSITIVE_RESULT")
      .slice(0, 5)
      .map((item, idx) => ({
        id: `focus-${idx + 1}`,
        order: idx + 1,
        title: item.recommendedAction,
        reason: item.whyItMatters,
        category: item.category,
        associatedPriorityItemId: item.id,
        suggestedAction: item.recommendedAction,
        canElmoHandle: !item.requiresApproval,
        requiresApproval: item.requiresApproval,
        actionPayload: item.actionPayload,
      }));

    // ------------------------------------------------------------------------
    // Construct Executable ELMO Recommendations
    // ------------------------------------------------------------------------
    const recommendations: ElmoRecommendation[] = [];

    // Pending approvals recommendation
    if (input.workStatus.pendingApprovals.length > 0) {
      const topApproval = input.workStatus.pendingApprovals[0];
      recommendations.push({
        id: `rec-approval-${topApproval.id}`,
        title: `Authorize ${topApproval.action}`,
        description: `Review pending ${topApproval.riskLevel} risk action requested by ${topApproval.requestedBy}.`,
        impact: "Unblocks autonomous agent execution and continues workflow.",
        requiresApproval: true,
        actionType: "review_approval",
        actionPayload: { type: "review_approval", targetId: topApproval.id },
        canAutoExecute: false,
      });
    }

    // Funnel optimization recommendation
    const highDropOffFunnel = input.funnelHealth.activeFunnels.find(
      (f) => f.dropOffPoints && f.dropOffPoints.length > 0
    );
    if (highDropOffFunnel) {
      recommendations.push({
        id: `rec-funnel-${highDropOffFunnel.funnelId}`,
        title: `Optimize ${highDropOffFunnel.name} CTA & Form`,
        description: `Diagnose conversion drop-off on ${highDropOffFunnel.name} and draft an A/B test plan.`,
        impact: `Potential to lift conversion rate from ${highDropOffFunnel.conversionRate.toFixed(1)}%.`,
        requiresApproval: false,
        actionType: "optimize_funnel",
        actionPayload: {
          type: "optimize_funnel",
          targetId: highDropOffFunnel.funnelId,
          parameters: { funnelName: highDropOffFunnel.name },
        },
        canAutoExecute: true,
      });
    }

    // Lead follow-up recommendation
    if (input.snapshot.newLeadsCount > 0) {
      recommendations.push({
        id: `rec-leads-${now}`,
        title: "Prepare Inbound Lead Outreach Drafts",
        description: `Generate tailored follow-up messages for ${input.snapshot.newLeadsCount} recent prospective contact${input.snapshot.newLeadsCount === 1 ? "" : "s"}.`,
        impact: "Improves conversion from prospect to qualified opportunity.",
        requiresApproval: false,
        actionType: "follow_up_leads",
        actionPayload: {
          type: "follow_up_leads",
          parameters: { count: input.snapshot.newLeadsCount },
        },
        canAutoExecute: true,
      });
    }

    // Overdue task resolution recommendation
    if (input.workStatus.overdueTasks.length > 0) {
      const topOverdue = input.workStatus.overdueTasks[0];
      recommendations.push({
        id: `rec-overdue-${topOverdue.id}`,
        title: `Assist with Task: "${topOverdue.title}"`,
        description: `Deploy specialist agent to assist ${topOverdue.ownerName} in completing overdue task.`,
        impact: "Prevents milestone delays and maintains operational cadence.",
        requiresApproval: false,
        actionType: "review_overdue",
        actionPayload: {
          type: "review_overdue",
          targetId: topOverdue.id,
          parameters: { title: topOverdue.title },
        },
        canAutoExecute: true,
      });
    }

    // Ensure at least one high-leverage strategic recommendation is always present
    if (recommendations.length === 0) {
      recommendations.push({
        id: `rec-strategic-growth-${now}`,
        title: "Conduct Weekly Pipeline & Funnel Performance Review",
        description: "Analyze cross-channel lead acquisition efficiency and identify highest-leverage conversion opportunities.",
        impact: "Identifies hidden pipeline opportunities and unblocks revenue growth.",
        requiresApproval: false,
        actionType: "run_analysis",
        actionPayload: {
          type: "run_analysis",
          parameters: { scope: "weekly_audit" },
        },
        canAutoExecute: true,
      });
    }

    return {
      priorityItems: items,
      todayFocus,
      recommendations,
    };
  }
}
