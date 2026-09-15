/**
 * ELMO Phase 1 — Canonical Request & Future Engine Interface Types
 *
 * Establishes the authoritative internal representation for all ELMO requests
 * across both text and voice interfaces.
 */

import { ElmoSaaSIntent, ExtractedIntentEntities } from "@/services/elmo-intent.service";

export type ExecutionCategory = "direct_response" | "action" | "workflow";

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
  context: Record<string, unknown>;
  businessContext: Record<string, unknown>;
  entities: ExtractedIntentEntities;
  requestedOutcome?: string;
  timeConstraint?: string;
  goalLikeRequest: boolean;
  goalData?: GoalIntentData;
  requiresAction: boolean;
  requiresPlanning: boolean;
  requiresApproval: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  timestamp: number;
}

export interface ConversationContinuityState {
  activeTopic?: string;
  activeTargetAudience?: string;
  activePageType?: string;
  activeFunnelType?: string;
  activeOffer?: string;
  activeStyle?: string;
  topic?: string;
  targetAudience?: string;
  style?: string;
  recentEntities: ExtractedIntentEntities;
  lastIntent?: ElmoSaaSIntent;
  lastExecutionCategory?: ExecutionCategory;
  updatedAt: number;
}
