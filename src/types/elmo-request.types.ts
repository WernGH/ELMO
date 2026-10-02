/**
 * ELMO Phase 1 — Canonical Request & Future Engine Interface Types
 *
 * Establishes the authoritative internal representation for all ELMO requests
 * across both text and voice interfaces.
 */

import { UserContext, UserGoal, GuardrailCategory } from "./user-context.types";

export type ExecutionCategory = "direct_response" | "action" | "workflow";

/**
 * All 24 standard ELMO Phase 1 intents + legacy aliases for 100% backward compatibility
 */
export type ElmoSaaSIntent =
  // Standard Phase 1 Intents (24 canonical)
  | "greeting"
  | "casual_conversation"
  | "question"
  | "information_request"
  | "recommendation"
  | "planning"
  | "business_analysis"
  | "content_creation"
  | "funnel_request"
  | "website_request"
  | "page_request"
  | "contact_request"
  | "email_request"
  | "automation_request"
  | "analytics_request"
  | "coding_request"
  | "research_request"
  | "task_request"
  | "goal_request"
  | "execution_request"
  | "confirmation"
  | "modification"
  | "cancellation"
  | "troubleshooting"
  // Legacy / Specialized Aliases
  | "funnel_creation"
  | "funnel_modification"
  | "page_creation"
  | "page_modification"
  | "copywriting"
  | "email_creation"
  | "contact_management"
  | "website_creation"
  | "website_modification"
  | "component_creation"
  | "code_generation"
  | "preview_request"
  | "funnel_discussion"
  | "brainstorming"
  | "task_execution"
  | "goal_formulation"
  | "optimization_request"
  | "executive_briefing"
  | "memory_store"
  | "memory_forget"
  | "memory_update"
  | "memory_query"
  | "system_status";

/**
 * 20+ Structured Entity fields + backward compatibility fields
 */
export interface ExtractedIntentEntities {
  // 20+ Canonical Entities (Section 6)
  business?: string;
  industry?: string;
  audience?: string;
  product?: string;
  service?: string;
  offer?: string;
  funnel?: string;
  page?: string;
  campaign?: string;
  customer?: string;
  contact?: string;
  lead?: string;
  goal?: string;
  task?: string;
  metric?: string;
  date?: string;
  deadline?: string;
  budget?: string;
  location?: string;
  URL?: string;
  platform?: string;

  // Legacy & Specific Sub-fields
  funnelType?: string;
  targetAudience?: string;
  pageType?: string;
  sectionType?: string;
  topic?: string;
  style?: string;
  responsive?: string;
  contactEmail?: string;
  metricType?: string;
  [key: string]: unknown;
}

export interface GoalIntentData {
  isGoal: boolean;
  outcome?: string;
  metric?: string;
  targetValue?: number | string;
  timeConstraint?: string;
  requiresPlanning: boolean;
}

export interface OrchestratorHandoffContext {
  requestId: string;
  conversationId: string;
  userId: string;
  organizationId: string;
  userGoal: string;
  intent: ElmoSaaSIntent;
  executionCategory: ExecutionCategory;
  context: Record<string, unknown>;
  companyBrainContext?: Record<string, unknown>;
  relevantMemories?: Array<{ content: string; category: string; importance: number }>;
  constraints?: Record<string, unknown>;
  requestedOutcome?: string;
  approvalRequirements?: {
    required: boolean;
    reason?: string;
  };
  entities: ExtractedIntentEntities;
  timestamp: number;
}

export interface ElmoRequest {
  requestId: string;
  conversationId: string;
  userId: string;
  organizationId: string;
  message: string;
  source: "text" | "voice" | "api";
  language: string;
  detectedLanguage: string;
  isCodeSwitched: boolean;
  intent: ElmoSaaSIntent;
  executionCategory: ExecutionCategory;
  guardrailCategory?: GuardrailCategory;
  userContext?: UserContext;
  context: Record<string, unknown>;
  businessContext: Record<string, unknown>;
  entities: ExtractedIntentEntities;
  requestedOutcome?: string;
  timeConstraint?: string;
  goalLikeRequest: boolean;
  goalData?: GoalIntentData;
  userGoal?: UserGoal;
  requiresAction: boolean;
  requiresPlanning: boolean;
  requiresApproval: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  timestamp: number;
}

export interface ConversationContinuityState {
  activeIndustry?: string;
  activeTopic?: string;
  activeTargetAudience?: string;
  activePageType?: string;
  activeFunnelType?: string;
  activeOffer?: string;
  activeStyle?: string;
  activeSection?: string;
  activeCampaign?: string;
  activeProduct?: string;
  activeService?: string;
  // Backward compatibility aliases
  topic?: string;
  targetAudience?: string;
  style?: string;
  recentEntities: ExtractedIntentEntities;
  lastIntent?: ElmoSaaSIntent;
  lastExecutionCategory?: ExecutionCategory;
  updatedAt: number;
}
