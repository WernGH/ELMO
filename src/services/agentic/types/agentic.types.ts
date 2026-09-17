/**
 * ELMO Phase 3 — Agentic Engine & AI Web/Coding Agent Type Definitions
 *
 * Establishes formal contract schemas for:
 * 1. Agent Registry & Specialist Metadata
 * 2. Controlled Agent-to-Agent Structured Messaging
 * 3. Execution Planner, Steps & Approval Gates
 * 4. Web/Coding Agent Page Models, Sections, Builds & Previews
 */

import { SectionType, PageType, PageStatus } from "@/types/database.types";

// ============================================================================
// 1. Agent Registry & Specialist Roles
// ============================================================================

export type AgentRole =
  | "ORCHESTRATOR"
  | "RESEARCH"
  | "MARKETING"
  | "COPY"
  | "FUNNEL"
  | "WEB_CODING"
  | "ANALYTICS";

export interface AgentExecutionLimits {
  maxHops: number;
  maxToolCallsPerTurn: number;
  timeoutMs: number;
  maxRetries: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  capabilities: string[];
  allowedTools: string[];
  permissions: string[];
  systemInstructions: string;
  enabled: boolean;
  version: string;
  priority: number;
  executionLimits: AgentExecutionLimits;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

// ============================================================================
// 2. Structured Agent-to-Agent Messaging
// ============================================================================

export type AgentMessageType =
  | "TASK_REQUEST"
  | "TASK_RESPONSE"
  | "INFORMATION_REQUEST"
  | "INFORMATION_RESPONSE"
  | "REVIEW_REQUEST"
  | "REVIEW_RESPONSE"
  | "HANDOFF"
  | "ERROR"
  | "COMPLETED";

export interface AgentMessage {
  messageId: string;
  executionId: string;
  sender: string;
  recipient: string;
  messageType: AgentMessageType;
  task: string;
  context: Record<string, unknown>;
  input: Record<string, unknown>;
  expectedOutput?: string;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// 3. Structured Agent Execution Results
// ============================================================================

export interface AgentActionResult {
  action: string;
  description: string;
  targetId?: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
}

export interface AgentResult {
  agentId: string;
  success: boolean;
  summary: string;
  data: Record<string, unknown>;
  recommendations: string[];
  actionsTaken: AgentActionResult[];
  toolsUsed: string[];
  needsMoreWork: boolean;
  nextSuggestedAgent?: string;
  confidence: number;
  errors?: string[];
  artifacts?: Array<{ type: string; name: string; url?: string; content?: unknown }>;
  metrics?: Record<string, number>;
  warnings?: string[];
  retryCount?: number;
}

// ============================================================================
// 4. Execution Plan & Risk-Based Approval System
// ============================================================================

export type ExecutionState =
  | "CREATED"
  | "PLANNING"
  | "WAITING_FOR_INPUT"
  | "WAITING_FOR_APPROVAL"
  | "EXECUTING"
  | "VERIFYING"
  | "RETRYING"
  | "REPLANNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PlanStatus = ExecutionState | "PENDING" | "IN_PROGRESS";

export interface CanonicalExecutionObject {
  id: string;
  organizationId: string;
  userId: string;
  conversationId?: string;
  goal: string;
  objective: string;
  context: Record<string, unknown>;
  plan: ExecutionPlan;
  steps: ExecutionStep[];
  selectedAgents: string[];
  selectedTools: string[];
  status: ExecutionState;
  currentStep: number;
  approvalState?: {
    required: boolean;
    status: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "MODIFIED";
    details?: PendingApprovalDetails;
  };
  verificationState?: {
    status: "PENDING" | "PASSED" | "FAILED";
    details?: Record<string, unknown>;
    errors?: string[];
  };
  retryCount: number;
  replanCount: number;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export type StepStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "EXECUTING"
  | "VERIFYING"
  | "RETRYING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED"
  | "AWAITING_APPROVAL";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  agentId: string;
  agentName: string;
  task: string;
  dependencies: string[]; // Step IDs that must finish before this step
  status: StepStatus;
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  summary?: string;
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PendingApprovalDetails {
  approvalId?: string;
  stepId: string;
  agentId: string;
  actionTitle: string;
  description: string;
  riskLevel: RiskLevel;
  proposedChanges: Record<string, unknown>;
  requestedAt: number;
}

export interface ExecutionPlan {
  id: string;
  executionId: string;
  organizationId: string;
  userId: string;
  objective: string;
  steps: ExecutionStep[];
  currentStepIndex: number;
  status: PlanStatus;
  approvalRequirements?: PendingApprovalDetails;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  summary?: string;
}

export interface ExecutionHistoryRecord {
  executionId: string;
  requestId?: string;
  organizationId: string;
  userId: string;
  goal: string;
  objective: string;
  status: PlanStatus;
  stepsCount: number;
  completedStepsCount: number;
  agentsInvolved: string[];
  toolsUsed: string[];
  retryCount: number;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  summary: string;
  error?: string;
  artifacts?: Array<{ type: string; name: string; url?: string; content?: unknown }>;
  previewUrl?: string;
  approvalStatus?: "NONE" | "REQUESTED" | "APPROVED" | "REJECTED";
}

// ============================================================================
// 5. Web & Coding Agent Models (Landing Pages, Websites, Components)
// ============================================================================

export interface WebsiteStyleConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
  themeMode: "dark" | "light" | "auto";
}

export interface SectionContentModel {
  headline?: string;
  subheadline?: string;
  badge?: string;
  bodyText?: string;
  primaryCta?: {
    label: string;
    url: string;
    actionType?: "scroll" | "link" | "modal" | "submit";
  };
  secondaryCta?: {
    label: string;
    url: string;
  };
  items?: Array<{
    title: string;
    description: string;
    icon?: string;
    badge?: string;
    metric?: string;
    author?: string;
    role?: string;
    avatarUrl?: string;
    price?: string;
    period?: string;
    features?: string[];
    isPopular?: boolean;
    answer?: string;
    question?: string;
    quote?: string;
  }>;
  formFields?: Array<{
    name: string;
    label: string;
    type: "text" | "email" | "tel" | "textarea" | "select";
    placeholder?: string;
    required: boolean;
    options?: string[];
  }>;
  footerLinks?: Array<{
    category: string;
    links: Array<{ label: string; url: string }>;
  }>;
  customHtml?: string;
  [key: string]: unknown;
}

export interface WebsiteSectionModel {
  id: string;
  pageId: string;
  sectionType: SectionType;
  orderIndex: number;
  name: string;
  content: SectionContentModel;
  layout: {
    containerWidth?: "narrow" | "normal" | "wide" | "full";
    paddingY?: "sm" | "md" | "lg" | "xl";
    alignment?: "left" | "center" | "right";
    columns?: 1 | 2 | 3 | 4;
  };
  styles: {
    backgroundColor?: string;
    customClasses?: string;
    gradient?: string;
  };
  responsive: {
    hideOnMobile?: boolean;
    hideOnDesktop?: boolean;
    stackOnMobile?: boolean;
  };
}

export interface WebsitePageModel {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  slug: string;
  pageType: PageType;
  status: PageStatus;
  title: string;
  metaDescription?: string;
  sections: WebsiteSectionModel[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteProject {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  projectType?: ProjectType;
  projectContext?: ProjectContext;
  styles: WebsiteStyleConfig;
  pages: WebsitePageModel[];
  activeVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  description: string;
  snapshot: WebsiteProject;
  createdAt: string;
  createdBy: string;
}

// ============================================================================
// 6. Validation & Preview Payload
// ============================================================================

export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PreviewPayload {
  projectId: string;
  pageId: string;
  pageTitle: string;
  slug: string;
  renderedHtml: string;
  sectionsCount: number;
  styles: WebsiteStyleConfig;
  sections: WebsiteSectionModel[];
  viewportOptions: Array<"desktop" | "tablet" | "mobile">;
  generatedAt: number;
}

// ============================================================================
// 7. Phase 3 Web Project Engine & Application Builder Types
// ============================================================================

export type ProjectType =
  | "Landing Page"
  | "Sales Page"
  | "Lead Generation Page"
  | "Product Page"
  | "Service Page"
  | "Corporate Website"
  | "Business Website"
  | "Restaurant Website"
  | "Property Website"
  | "Insurance Website"
  | "Coaching Website"
  | "Portfolio Website"
  | "Event Website"
  | "Booking Website"
  | "Membership Website"
  | "SaaS Marketing Website"
  | "E-commerce Website"
  | "Web Application"
  | "Dashboard"
  | "Customer Portal"
  | "Admin Portal"
  | "Internal Business Tool"
  | "CRM Interface"
  | "Custom Web Project"
  | (string & {});

export type BrandStyleDirection =
  | "Premium"
  | "Minimal"
  | "Luxury"
  | "Corporate"
  | "Modern"
  | "Futuristic"
  | "Editorial"
  | "Bold"
  | "Professional"
  | "Playful"
  | "Technical"
  | "Conversion-focused"
  | (string & {});

export interface ProjectContext {
  projectType: ProjectType;
  industry: string;
  businessType: string;
  businessName: string;
  targetAudience: string;
  trafficSource?: string;
  campaignGoal?: string;
  conversionGoal?: string;
  offer?: string;
  productOrService?: string;
  pricePosition?: string;
  awarenessLevel?: string;
  primaryCTA?: { label: string; url?: string; actionType?: string };
  secondaryCTA?: { label: string; url?: string; actionType?: string };
  requiredFeatures: string[];
  brandStyle: BrandStyleDirection;
  technicalRequirements: string[];
  assumptions: string[];
}

export interface ApplicationSpecification {
  projectId: string;
  name: string;
  type: "Dashboard" | "CRM" | "Customer Portal" | "Admin Portal" | "Internal Tool" | "Custom Application";
  requirements: string[];
  userRoles: Array<{ role: string; description: string; permissions: string[] }>;
  userFlows: Array<{ flowName: string; steps: string[] }>;
  dataModelRequirements: Array<{
    entityName: string;
    fields: Array<{ name: string; type: string; required?: boolean }>;
  }>;
  screens: Array<{ id: string; name: string; route: string; description: string }>;
  components: Array<{ name: string; type: string; purpose: string }>;
  apiRequirements: Array<{ method: string; path: string; description: string }>;
  permissions: string[];
  validationRules: string[];
  testingPlan: string[];
}

export interface VisualQAResult {
  passed: boolean;
  score: number;
  checks: Array<{ name: string; passed: boolean; details?: string }>;
  defects: string[];
}

export interface FunctionalQAResult {
  passed: boolean;
  score: number;
  checks: Array<{ name: string; passed: boolean; details?: string }>;
  defects: string[];
}

export interface QAEvaluationResult {
  isValid: boolean;
  visualQA: VisualQAResult;
  functionalQA: FunctionalQAResult;
  selfHealedActions?: string[];
}
