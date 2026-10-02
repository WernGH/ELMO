/**
 * ELMO Phase 1 — Canonical User Context & Goal Understanding Types
 *
 * Establishes the authoritative internal context object representing the user,
 * organization, active state, permissions, and goal understanding.
 */

import { Role, RolePermissions } from "./organization.types";
import { MessageRole } from "./chat.types";
import { ElmoSaaSIntent, ExtractedIntentEntities } from "./elmo-request.types";

export type GuardrailCategory = "information" | "recommendation" | "planning" | "action";

export type RequiredCapability =
  | "information"
  | "recommendation"
  | "planning"
  | "action"
  | "analysis"
  | "troubleshooting"
  | "coding";

export interface UserGoal {
  /** The raw input message received from the user */
  rawMessage: string;
  /** Normalized, actionable or analytical goal description */
  goalDescription: string;
  /** Inferred or explicit industry domain (e.g., Insurance, Restaurant, SaaS, Property) */
  industry?: string;
  /** Inferred or explicit business context */
  businessContext?: string;
  /** Target audience if identified or 'Unknown' */
  targetAudience?: string;
  /** Core capability required to fulfill the goal */
  requiredCapability: RequiredCapability;
  /** Specific action required if actionable (e.g., create_landing_page) */
  requiredAction?: string;
  /** Essential pieces of missing information needed before execution */
  missingInformation: string[];
  /** Whether this goal requires downstream execution (vs conversational response) */
  isActionable: boolean;
  /** Whether the request lacks necessary context to proceed */
  ambiguityDetected: boolean;
  /** Helpful clarification question if ambiguity is detected */
  clarificationQuestion?: string;
  /** Execution or planning priority */
  priority: "low" | "medium" | "high" | "urgent";
}

export interface UserContext {
  /** Authenticated user identifier */
  userId: string;
  /** Active organization tenant identifier */
  organizationId: string;
  /** User's role within the organization */
  role: Role;
  /** Granular permission matrix for the role */
  permissions: RolePermissions;
  /** Currently selected workspace or tenant slug */
  activeWorkspace?: string;
  /** Currently active project identifier or name */
  activeProject?: string;
  /** Currently active funnel identifier or name */
  activeFunnel?: string;
  /** Currently active page identifier or name */
  activePage?: string;
  /** Active conversation thread ID */
  conversationId: string;
  /** Recent messages within the active conversation */
  recentMessages: Array<{ role: MessageRole; content: string }>;
  /** Active detected or requested conversation language (e.g., 'en', 'ms', 'zh') */
  language: string;
  /** User or organization timezone */
  timezone?: string;
  /** Current high-level user goal extracted from dialogue */
  currentGoal?: UserGoal;
  /** Current semantic intent */
  currentIntent?: ElmoSaaSIntent;
  /** Guardrail classification */
  guardrailCategory?: GuardrailCategory;
}
