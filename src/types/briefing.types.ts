/**
 * ELMO Executive AI — Canonical Executive Briefing Types & Contracts
 *
 * Defines industry-agnostic business intelligence data models for:
 * 1. Business Snapshot (Leads, Contacts, Volume & Conversion trends)
 * 2. Funnel Health & Optimization Opportunities
 * 3. Work & Execution Status (Approvals, Tasks, Agent Executions)
 * 4. AI Workforce Summary (Operational agents, completed, in-progress, failed)
 * 5. Company Brain Context (Memory signals, decisions, patterns)
 * 6. Executive Priority Engine Items ("What happened", "Why it matters", "Recommended action")
 * 7. Today's Focus (Ranked actionable focus items)
 * 8. Spoken Briefing (Natural speech synthesis script)
 */

export type ExecutivePriorityCategory =
  | "ATTENTION_REQUIRED"
  | "WATCH"
  | "OPPORTUNITY"
  | "POSITIVE_RESULT"
  | "INFORMATION";

export type ExecutivePriorityLevel = "low" | "medium" | "high" | "urgent";

export type ExecutiveSeverity = "info" | "warning" | "critical";

export interface LeadSourceStat {
  source: string;
  count: number;
  percentage: number;
}

export interface ImportantContactActivity {
  contactId: string;
  contactName: string;
  eventType: string;
  timestamp: string;
  details?: string;
}

export interface BusinessSnapshot {
  newLeadsCount: number;
  newContactsCount: number;
  leadSources: LeadSourceStat[];
  importantContactActivity: ImportantContactActivity[];
  leadVolumeChange: {
    current: number;
    previous: number;
    percentChange: number | null;
    trend: "up" | "down" | "neutral";
  };
  conversionChange: {
    currentRate: number; // percentage 0-100
    previousRate: number; // percentage 0-100
    rateDifference: number;
    trend: "up" | "down" | "neutral";
  };
  funnelActivity: {
    activeFunnelsCount: number;
    totalViews: number;
    totalConversions: number;
  };
  importantBusinessEvents: Array<{
    title: string;
    type: string;
    timestamp: string;
    impact: string;
  }>;
}

export interface FunnelDropOffPoint {
  stepName: string;
  stepOrder: number;
  visitors: number;
  dropOffRate: number; // percentage 0-100
  reason?: string;
}

export interface ActiveFunnelHealth {
  funnelId: string;
  name: string;
  status: string;
  traffic: number;
  conversionRate: number;
  submissions: number;
  dropOffPoints: FunnelDropOffPoint[];
  anomaly?: string;
  optimizationOpportunity?: string;
}

export interface FunnelHealthSummary {
  activeFunnels: ActiveFunnelHealth[];
  overallConversionHealth: "healthy" | "warning" | "critical" | "insufficient_data";
  anomalies: string[];
  opportunities: string[];
}

export interface WorkExecutionStatus {
  pendingApprovals: Array<{
    id: string;
    action: string;
    riskLevel: "Low" | "Medium" | "High";
    requestedBy: string;
    category: string;
    details?: string | null;
    createdAt: string;
  }>;
  highPriorityTasks: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    ownerName: string;
    ownerType: string;
    dueDate?: string | null;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    ownerName: string;
    priority: string;
  }>;
  blockedTasks: Array<{
    id: string;
    title: string;
    ownerName: string;
    reason?: string;
  }>;
  activeExecutions: Array<{
    executionId: string;
    objective: string;
    status: string;
    agentsInvolved: string[];
    startedAt: string;
  }>;
  failedExecutions: Array<{
    executionId: string;
    objective: string;
    error?: string;
    timestamp: string;
  }>;
  retryingExecutions: Array<{
    executionId: string;
    objective: string;
    retryCount: number;
  }>;
  completedExecutions: Array<{
    executionId: string;
    objective: string;
    summary?: string;
    completedAt: string;
  }>;
  replanningEvents: Array<{
    executionId: string;
    reason: string;
    timestamp: string;
  }>;
  itemsRequiringHumanAttention: Array<{
    id: string;
    type: "approval" | "overdue_task" | "failed_execution" | "anomaly";
    title: string;
    reason: string;
    actionRequired: string;
  }>;
}

export interface AgentStatusSummary {
  agentId: string;
  name: string;
  role: string;
  status: "active" | "standby" | "busy" | "error";
  completedCount: number;
  inProgressCount: number;
  requiresApprovalCount: number;
  waitingInputCount: number;
  recentResults: Array<{
    summary: string;
    timestamp: string;
  }>;
}

export interface AIWorkforceSummary {
  agents: AgentStatusSummary[];
  totalCompleted: number;
  totalExecuting: number;
  totalRequiringApproval: number;
  totalFailed: number;
}

export interface CompanyBrainIntelligenceSummary {
  recentEvents: Array<{
    title: string;
    category: string;
    importance: number;
    summary: string;
  }>;
  strategicDecisions: Array<{
    title: string;
    impact: string;
    timestamp: string;
  }>;
  activeGoals: Array<{
    id: string;
    title: string;
    progress: number;
    status: string;
    target?: number | null;
    currentValue?: number;
    deadline?: string | null;
  }>;
  customerPatterns: string[];
  relevantHistoricalContext: string[];
}

export interface ExecutiveActionPayload {
  type:
    | "optimize_funnel"
    | "follow_up_leads"
    | "review_approval"
    | "create_task"
    | "run_analysis"
    | "review_overdue"
    | "custom";
  targetId?: string;
  parameters?: Record<string, unknown>;
}

export interface ExecutivePriorityItem {
  id: string;
  priority: ExecutivePriorityLevel;
  category: ExecutivePriorityCategory;
  severity: ExecutiveSeverity;
  businessImpact: string;
  source: string;
  timestamp: number;
  // The canonical "Why It Matters" 3-part framework
  whatHappened: string; // FACT
  whyItMatters: string; // ANALYSIS
  recommendedAction: string; // RECOMMENDATION
  requiresApproval: boolean;
  actionPayload?: ExecutiveActionPayload;
}

export interface TodayFocusItem {
  id: string;
  order: number;
  title: string;
  reason: string;
  category: string;
  associatedPriorityItemId?: string;
  suggestedAction?: string;
  canElmoHandle: boolean;
  requiresApproval: boolean;
  actionPayload?: ExecutiveActionPayload;
}

export interface ElmoRecommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  requiresApproval: boolean;
  actionType: string;
  actionPayload?: ExecutiveActionPayload;
  canAutoExecute: boolean;
}

export interface DataFreshnessInfo {
  leadsLastUpdated: string;
  funnelsLastUpdated: string;
  tasksLastUpdated: string;
  approvalsLastUpdated: string;
  analyticsPeriod: string;
  isRealtime: boolean;
}

export interface ExecutiveBriefing {
  id: string;
  organizationId: string;
  userId?: string | null;
  briefingDate: string; // YYYY-MM-DD
  generatedAt: string; // ISO string
  period: {
    start: string;
    end: string;
  };
  businessSnapshot: BusinessSnapshot;
  funnelHealth: FunnelHealthSummary;
  workStatus: WorkExecutionStatus;
  workforceSummary: AIWorkforceSummary;
  companyBrain: CompanyBrainIntelligenceSummary;
  priorityItems: ExecutivePriorityItem[];
  todayFocus: TodayFocusItem[];
  recommendations: ElmoRecommendation[];
  spokenBriefing: string;
  language: string;
  status: "active" | "archived";
  dataFreshness: DataFreshnessInfo;
  isCached: boolean;
  metadata?: Record<string, unknown>;
}

export interface BriefingRequestOptions {
  userId: string;
  organizationId: string;
  language?: string;
  forceRefresh?: boolean;
  date?: string; // defaults to today YYYY-MM-DD
}
