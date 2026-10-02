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
  | "ANALYTICS"
  | "SALES"
  | "OPERATIONS"
  | "STRATEGY"
  | "AUTOMATION"
  | "SUPPORT";

export type WorkerRole = AgentRole;

export type WorkerStatus =
  | "AVAILABLE"
  | "BUSY"
  | "WAITING"
  | "PAUSED"
  | "DISABLED"
  | "ERROR"
  | "MAINTENANCE";

export interface WorkerPerformanceMetrics {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksFailed: number;
  verificationFailures: number;
  averageExecutionTimeMs: number;
  retryCount: number;
  replanCount: number;
  approvalRequests: number;
  humanCorrections: number;
  handoffs: number;
  blockedTasks: number;
}

export interface AgentExecutionLimits {
  maxHops: number;
  maxToolCallsPerTurn: number;
  timeoutMs: number;
  maxRetries: number;
}

export interface WorkerStructuredCapability {
  capabilityId: string;
  name: string;
  description: string;
  skills: string[];
  tools: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  permissions: string[];
  verificationRequirements: string[];
  dependencies?: string[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  capabilities: string[];
  skills?: string[];
  allowedTools: string[];
  permissions: string[];
  systemInstructions: string;
  enabled: boolean;
  version: string;
  priority: number;
  executionLimits: AgentExecutionLimits;
  robotName?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  verificationRules?: string[];
  verificationRequirements?: string[];
  structuredCapabilities?: WorkerStructuredCapability[];
  dependencies?: string[];
  approvalRequirements?: string[];
  organizationId?: string;
  status?: WorkerStatus;
  availability?: number;
  workload?: number;
  capacity?: number;
  workerType?: "foundational" | "specialist" | "custom";
  source?: "builtin" | "company" | "github";
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string;
  currentAssignmentId?: string;
  performanceMetrics?: WorkerPerformanceMetrics;
}

export interface WorkerDefinition extends AgentDefinition {
  organizationId?: string;
  status: WorkerStatus;
  availability: number;
  workload: number;
  capacity: number;
  workerType: "foundational" | "specialist" | "custom";
  source: "builtin" | "company" | "github";
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  currentAssignmentId?: string;
  performanceMetrics: WorkerPerformanceMetrics;
}

// ============================================================================
// 1a-2. Worker Contracts & Activity Tracking (Phase 4)
// ============================================================================

export interface WorkerHandoffContract {
  handoffId: string;
  fromWorkerId: string;
  toWorkerId: string;
  executionId: string;
  taskId: string;
  reason?: string;
  objective: string;
  completedWork: string;
  requiredNextAction: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  evidence: string[];
  assumptions?: string[];
  limitations?: string[];
  verificationStatus: "PASSED" | "PARTIAL" | "UNVERIFIED" | "VERIFIED";
  timestamp: number;
}

export interface WorkerResultContract {
  status:
    | "COMPLETED"
    | "PARTIAL"
    | "BLOCKED"
    | "FAILED"
    | "WAITING_FOR_INPUT"
    | "WAITING_FOR_APPROVAL";
  summary: string;
  outputs: Record<string, unknown>;
  toolsUsed: string[];
  evidence: string[];
  assumptions: string[];
  limitations: string[];
  blockers?: Array<{
    type: WorkerBlockerType;
    reason?: string;
    description?: string;
    requiredAction?: string;
    severity?: string;
    details?: unknown;
  }>;
  verificationStatus?: "VERIFIED" | "UNVERIFIED" | "FAILED" | "PASSED" | string;
  verification?: {
    technicalPassed: boolean;
    businessPassed: boolean;
    checks: string[];
  };
  nextRecommendedAction?: string;
  timestamp?: number;
}

export interface StrategyOption {
  id: string;
  title: string;
  description: string;
  expectedImpact: string;
  pros: string[];
  cons: string[];
  tradeoffs?: string[];
  riskLevel: RiskLevel;
}

export interface StrategyWorkerOutput {
  problem: string;
  desiredOutcome: string;
  findings: string[];
  strategicOptions: StrategyOption[];
  recommendedNextActions: string[];
  requiredWorkers: string[];
  dependencies: Array<{ task: string; dependsOn: string }>;
  risks: Array<{ risk: string; mitigation: string; severity?: string }>;
  assumptions: string[];
  verificationCriteria: string[];
}

export interface AutomationWorkflowAction {
  stepNumber: number;
  actionType: string;
  targetTool: string;
  params: Record<string, unknown>;
  approvalRequired: boolean;
  riskLevel: RiskLevel;
}

export interface AutomationWorkflowCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "exists" | "not_equals";
  value: unknown;
}

export interface AutomationWorkflowOutput {
  workflow: {
    id?: string;
    name: string;
    trigger: {
      type: string;
      source: string;
      event: string;
      schema?: Record<string, unknown>;
    };
    conditions: AutomationWorkflowCondition[];
    actions: AutomationWorkflowAction[];
    verification: {
      tested: boolean;
      failureDetectionRules: string[];
      criteria: string[];
    };
    result?: {
      status: "CONFIGURED" | "TESTED" | "ACTIVE" | "PENDING_APPROVAL";
      summary: string;
      estimatedCycleReduction?: string;
    };
  };
}

export interface SupportWorkerOutput {
  enquiryClassification: {
    category: string;
    subCategory?: string;
    priority: "low" | "medium" | "high" | "urgent";
    sentiment: "positive" | "neutral" | "negative" | "frustrated";
    requiresHumanEscalation: boolean;
  };
  customerContext?: {
    identified: boolean;
    contactId?: string;
    name?: string;
    email?: string;
    accountStatus?: string;
    grounded: boolean;
  };
  groundedKnowledge?: {
    policyReferenced?: string;
    sourceDocs: string[];
    verifiedFacts: string[];
  };
  responseDraft: {
    messageText: string;
    tone: string;
    groundedInBrain: boolean;
    missingInformationFlagged?: boolean;
    missingInformationFields?: string[];
  };
  missingInformation?: string[];
  escalation?: {
    escalated: boolean;
    reason?: string;
    targetRole?: string;
    priority?: string;
    requiresApproval?: boolean;
  };
  approvalRequired: boolean;
}

export type WorkerBlockerType =
  | "MISSING_INFORMATION"
  | "MISSING_INPUT"
  | "MISSING_CAPABILITY"
  | "MISSING_SKILL"
  | "MISSING_TOOL"
  | "PERMISSION_DENIED"
  | "APPROVAL_REQUIRED"
  | "RESOURCE_LIMIT_REACHED"
  | "DEPENDENCY_FAILURE"
  | "EXECUTION_ERROR"
  | "VERIFICATION_FAILURE"
  | "INVALID_INPUT"
  | "INVALID_OUTPUT"
  | "WORKER_UNAVAILABLE";

export type WorkerActivityEvent =
  // Section A4 Minimum Event Types
  | "OUTCOME_CREATED"
  | "PLAN_CREATED"
  | "WORKER_ASSIGNED"
  | "WORKER_STARTED"
  | "WORKER_TOOL_STARTED"
  | "WORKER_TOOL_COMPLETED"
  | "WORKER_WAITING"
  | "WORKER_VERIFYING"
  | "WORKER_COMPLETED"
  | "WORKER_BLOCKED"
  | "HANDOFF_CREATED"
  | "HANDOFF_RECEIVED"
  | "ARTIFACT_CREATED"
  | "APPROVAL_REQUESTED"
  | "VERIFICATION_COMPLETED"
  | "OUTCOME_UPDATED"
  | "OUTCOME_ACHIEVED"
  | "OUTCOME_FAILED"
  // Phase 4 Operational Activity Events
  | "WORKER_SELECTED"
  | "TASK_ASSIGNED"
  | "TASK_STARTED"
  | "TOOL_CALLED"
  | "TASK_COMPLETED"
  | "TASK_BLOCKED"
  | "VERIFICATION_STARTED"
  | "VERIFICATION_FAILED"
  | "WORKER_REASSIGNED"
  | "WORKER_FAILED"
  | "WORKER_STATUS_CHANGED"
  | "LEARNING_SIGNAL_EMITTED"
  | "RESOURCE_LIMIT_CHECKED"
  | "HEALTH_CHECK_COMPLETED";

export interface WorkerActivityRecord {
  id: string;
  organizationId: string;
  executionId: string;
  taskId?: string;
  workerId: string;
  eventType: WorkerActivityEvent;
  timestamp: number;
  status: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 1b. Skill Registry Types (Reusable Capability Layer)
// ============================================================================

export type SkillCategory =
  | "Analysis"
  | "Analytics"
  | "Creation"
  | "Communication"
  | "Engineering"
  | "Governance"
  | "Strategy"
  | "Operations";

export type SkillSource = "builtin" | "company" | "github" | "marketplace";

export interface SkillExecutionLimits {
  timeoutMs: number;
  maxRetries: number;
  requiresSandbox?: boolean;
}

export interface SkillValidationRule {
  ruleId: string;
  description: string;
  severity: "error" | "warning";
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  category: SkillCategory;
  capabilities?: string[];
  permissions?: string[];
  allowedTools: string[];
  executionLimits: SkillExecutionLimits;
  version: string;
  enabled: boolean;
  validationRules?: SkillValidationRule[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 1c. Controlled Tool Registry Types
// ============================================================================

export interface ControlledToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: string[];
  allowedAgents: string[];
  allowedSkills: string[];
  approvalRequired: boolean;
  riskLevel: RiskLevel;
  executionLimits: {
    timeoutMs: number;
    maxRetries: number;
  };
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  verificationRequirements: string[];
  capabilities?: string[];
  enabled?: boolean;
  availability?: boolean;
  securityStatus?: "SECURE" | "RESTRICTED" | "APPROVAL_REQUIRED" | "DISABLED";
  supportedWorkers?: string[];
}

export interface ToolDiscoveryResult {
  toolId?: string;
  name?: string;
  capability: string;
  available: boolean;
  enabled: boolean;
  authorized: boolean;
  requiresApproval: boolean;
  securityStatus: string;
  blocker?: {
    status: "BLOCKED";
    reason: WorkerBlockerType | string;
    requiredCapability: string;
    requiredTool?: string;
    available: boolean;
    nextAction: string;
  };
}

// ============================================================================
// 1d. Dual Technical & Business Verification Types
// ============================================================================

export interface VerificationCheckItem {
  check: string;
  passed: boolean;
  details?: string;
}

export interface TechnicalVerificationResult {
  passed: boolean;
  checks: VerificationCheckItem[];
  errors?: string[];
}

export interface BusinessVerificationResult {
  passed: boolean;
  checks: VerificationCheckItem[];
  audienceAligned: boolean;
  ctaPresent: boolean;
  offerClear: boolean;
  tenantIsolated: boolean;
  idempotencyPreserved: boolean;
  errors?: string[];
}

export interface OutcomeVerificationReport {
  success: boolean;
  technical: TechnicalVerificationResult;
  business: BusinessVerificationResult;
  defects: string[];
  remedySuggestion?: string;
  verifiedAt: number;
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

export type ExecutionContext = Record<string, unknown>;

export interface AgentMessage {
  messageId: string;
  executionId: string;
  sender: string;
  recipient: string;
  messageType: AgentMessageType;
  task: string;
  context: ExecutionContext;
  input: Record<string, unknown>;
  inputData?: Record<string, unknown>;
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
  | "MISSING_CAPABILITY"
  | "UNSUPPORTED_ACTION"
  | "PLAN_VALIDATION_FAILED"
  | "EXECUTING"
  | "VERIFYING"
  | "RETRYING"
  | "REPLANNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PlanStatus = ExecutionState | "PENDING" | "IN_PROGRESS";

export type BusinessOutcomeStatus =
  | "BUSINESS_OUTCOME_VERIFIED"
  | "BUSINESS_OUTCOME_PARTIAL"
  | "WAITING_FOR_INPUT"
  | "WAITING_FOR_APPROVAL"
  | "MISSING_CAPABILITY"
  | "UNSUPPORTED_ACTION"
  | "PLAN_VALIDATION_FAILED"
  | "FAILED";

export interface ObjectiveUnderstanding {
  originalRequest: string;
  objectiveType:
    | "business_problem"
    | "diagnostic"
    | "operational"
    | "strategic"
    | "feature_request"
    | "creative"
    | "ambiguous"
    | "unsupported";
  desiredOutcome: string;
  knownFacts: string[];
  unknowns: string[];
  requestedActions: string[];
  constraints: string[];
  exclusions: string[];
  assumptions: string[];
  entities: Record<string, unknown>;
  measurableTargets: string[];
  timeframe?: string;
  industry?: string;
  confidence: number;
  requiresClarification: boolean;
  clarificationQuestions: string[];
  requiredCapabilities: string[];
  unsupportedCapabilities: string[];
}

export interface RequiredCapability {
  capability: string;
  purpose: string;
  requiredFor: string[];
  requiredTools?: string[];
  requiredSkills?: string[];
  requiredAgents?: string[];
  available: boolean;
  confidence: number;
  reason: string;
}

export interface CanonicalExecutionObject {
  id: string;
  organizationId: string;
  userId: string;
  conversationId?: string;
  goal: string;
  objective: string;
  context: Record<string, unknown>;
  knowledgeContext?: Record<string, unknown>;
  retrievalProvenance?: Array<{
    documentTitle: string;
    section?: string;
    version: number;
    score: number;
  }>;
  plan: ExecutionPlan;
  steps: ExecutionStep[];
  selectedAgents: string[];
  selectedSkills?: string[];
  selectedCapabilities?: string[];
  selectedTools: string[];
  plannedTools?: string[];
  executedTools?: string[];
  status: ExecutionState;
  businessOutcomeStatus?: BusinessOutcomeStatus;
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
  skills?: string[];
  tools?: string[];
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
  goal?: {
    type: string;
    desiredOutcome: string;
    successCriteria: string[];
  };
  informationRequired?: string[];
  missingInformation?: string[];
  clarificationQuestions?: string[];
  understanding?: ObjectiveUnderstanding;
  requiredCapabilities?: RequiredCapability[];
  missingCapabilities?: string[];
  unsupportedCapabilities?: string[];
  steps: ExecutionStep[];
  selectedSkills?: string[];
  selectedTools?: string[];
  currentStepIndex: number;
  status: PlanStatus;
  approvalRequirements?: PendingApprovalDetails;
  knowledgeContext?: any;
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

// ============================================================================
// 8. Phase 4.0.1 Intelligence Hardening Types
// ============================================================================

// 8a. Cost and Resource Control Models
export interface ResourceUsageMetrics {
  modelCalls: number;
  tokensUsed?: number;
  estimatedCost: number;
  currency: string;
  toolCalls: number;
  workerExecutions: number;
  executionDurationMs: number;
  retryCount: number;
  reassignmentCount: number;
  parallelWorkerCount: number;
  taskComplexity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  estimatedResourceConsumption: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

export interface ResourceQuotaLimits {
  maxWorkerExecutions: number;
  maxToolCalls: number;
  maxRetries: number;
  maxParallelWorkers: number;
  maxExecutionTimeMs: number;
  maxEstimatedCost: number;
}

export interface ResourceFootprintEstimate {
  workersCount: number;
  estimatedToolCalls: number;
  estimatedCost: number;
  expectedExecutionTimeSec: number;
  explanation: string;
  complexity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  withinLimits: boolean;
}

// 8b. Standardized Workforce Artifact Model
export type ArtifactType =
  | "RESEARCH_REPORT"
  | "ANALYTICS_REPORT"
  | "STRATEGY_PLAN"
  | "MARKETING_PLAN"
  | "COPY_PACKAGE"
  | "SALES_ANALYSIS"
  | "CODE_ARTIFACT"
  | "AUTOMATION_WORKFLOW"
  | "SUPPORT_CASE"
  | "OPERATIONS_PLAN"
  | "EXECUTIVE_BRIEFING"
  | "CUSTOM";

export type ArtifactStatus = "DRAFT" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "SUPERSEDED";

export interface WorkforceArtifact {
  artifactId: string;
  artifactType: ArtifactType;
  title: string;
  description: string;
  sourceWorker: string;
  sourceTask: string;
  organizationId: string;
  version: number;
  status: ArtifactStatus;
  content: string;
  structuredData: Record<string, unknown>;
  evidence: string[];
  assumptions: string[];
  verification?: {
    verified: boolean;
    verifier: string;
    timestamp: number;
    checks: string[];
    technicalPassed?: boolean;
    businessPassed?: boolean;
  };
  createdAt: number;
  updatedAt: number;
  previousVersionId?: string;
}

// 8c. Controlled Workforce Learning Signals
export type LearningSignalType =
  | "TASK_SUCCEEDED"
  | "TASK_FAILED"
  | "VERIFICATION_FAILED"
  | "HUMAN_CORRECTION"
  | "HUMAN_APPROVAL"
  | "HUMAN_REJECTION"
  | "WORKER_REASSIGNED"
  | "MISSING_CAPABILITY"
  | "MISSING_TOOL"
  | "REPEATED_FAILURE"
  | "SUCCESSFUL_WORKFLOW_PATTERN"
  | "ARTIFACT_ACCEPTED"
  | "ARTIFACT_REVISED";

export interface WorkforceLearningSignal {
  signalId: string;
  signalType: LearningSignalType;
  organizationId: string;
  executionId?: string;
  taskId?: string;
  workerId?: string;
  timestamp: number;
  payload: Record<string, unknown>;
  persistedToMemory: boolean;
  governedCategory?: "fact" | "preference" | "decision" | "policy" | "procedure" | "outcome" | "correction";
}

// 8d. Workforce Health & Self-Diagnosis Models
export type WorkforceHealthState =
  | "HEALTHY"
  | "DEGRADED"
  | "BLOCKED"
  | "UNAVAILABLE"
  | "PERMISSION_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "MISSING_CAPABILITY"
  | "MISSING_TOOL"
  | "DEPENDENCY_FAILURE"
  | "RESOURCE_LIMIT_REACHED";

export interface ReadinessComponentCheck {
  id: string;
  name: string;
  available: boolean;
  status: string;
  details?: string;
  error?: string;
}

export interface WorkforceReadinessReport {
  taskId: string;
  objective: string;
  overall: "READY" | "PARTIALLY_READY" | "BLOCKED";
  healthState: WorkforceHealthState;
  workers: ReadinessComponentCheck[];
  skills: ReadinessComponentCheck[];
  tools: ReadinessComponentCheck[];
  permissions: {
    granted: boolean;
    checked: string[];
    missing?: string[];
  };
  approval: {
    required: boolean;
    reason?: string;
  };
  resources: {
    withinLimits: boolean;
    estimatedFootprint: {
      workersCount: number;
      estimatedToolCalls: number;
      estimatedCost: number;
      expectedExecutionTimeSec: number;
    };
    limitBreaches?: string[];
  };
  blockers: Array<{
    type: WorkerBlockerType | WorkforceHealthState;
    reason: string;
    details?: unknown;
    nextAction: string;
  }>;
  explanation: {
    whatICanDo: string[];
    whatICannotDo: string[];
    why: string;
    whatIsMissing: string[];
    whatCanHappenNext: string[];
  };
  generatedAt: number;
}

// ============================================================================
// Phase 4.1: OUTCOME-DRIVEN ROBOT WORKFORCE EXPERIENCE TYPES
// ============================================================================

// 1. Desired Outcome Models
export type DesiredOutcomeStatus =
  | "UNDERSTANDING"
  | "PLANNING"
  | "READY"
  | "EXECUTING"
  | "WAITING"
  | "BLOCKED"
  | "VERIFYING"
  | "PARTIALLY_ACHIEVED"
  | "ACHIEVED"
  | "FAILED"
  | "CANCELLED";

export interface OutcomeTargetMetric {
  name: string;
  targetValue: string | number;
  currentValue?: string | number;
  unit?: string;
  baseline?: string | number;
}

export interface OutcomeMilestone {
  id: string;
  title: string;
  workerId?: string;
  robotName?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "FAILED";
  completedAt?: number;
  details?: string;
}

export interface DesiredOutcome {
  outcomeId: string;
  title: string;
  description?: string;
  desiredResult?: string;
  constraints?: string[];
  currentWorkerId?: string;
  progressState?: string;
  organizationId: string;
  userId: string;
  status: DesiredOutcomeStatus;
  successCriteria: string[];
  targetMetric?: OutcomeTargetMetric;
  requiredCapabilities: string[];
  assignedWorkers: string[];
  executionPlanId?: string;
  executionPlan?: ExecutionPlan;
  milestones: OutcomeMilestone[];
  artifacts: WorkforceArtifact[];
  blocker?: {
    reason: string;
    whatCompleted: string[];
    whatIsMissing: string[];
    nextAction: string;
  };
  blockers?: Array<{
    reason: string;
    whatCompleted: string[];
    whatIsMissing: string[];
    nextAction: string;
  }>;
  verification?: {
    verified: boolean;
    criteriaMet: string[];
    criteriaUnmet: string[];
    details: string;
    verifiedAt: number;
  };
  explanation?: {
    whatAchieved: string[];
    whatRemains: string[];
    whyPartial?: string;
    nextSteps: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface CreateOutcomeParams {
  title: string;
  description?: string;
  desiredResult?: string;
  constraints?: string[];
  organizationId: string;
  userId: string;
  targetMetric?: OutcomeTargetMetric;
  successCriteria?: string[];
  requiredCapabilities?: string[];
}

// 2. Robot Workforce Identity & Working State Models
export type RobotStatus =
  | "READY"
  | "THINKING"
  | "WORKING"
  | "USING_TOOL"
  | "WAITING"
  | "VERIFYING"
  | "COMPLETE"
  | "COMPLETED"
  | "BLOCKED"
  | "ERROR"
  | "APPROVAL_REQUIRED";

export type RobotWorkingPhase =
  | "IDLE"
  | "UNDERSTANDING"
  | "RESEARCHING"
  | "ANALYZING"
  | "DESIGNING"
  | "BUILDING"
  | "USING_TOOL"
  | "VERIFYING"
  | "WAITING_FOR_TOOL"
  | "WAITING_FOR_APPROVAL"
  | "COMPLETED"
  | "BLOCKED";

export interface RobotStructuredInput {
  objective: string;
  context: string[];
  constraints: string[];
  expectedOutput: string;
}

export interface RobotStructuredOutput {
  findings: string[];
  evidence: string[];
  verificationPassed: boolean;
  artifactId?: string;
  artifactTitle?: string;
  rawOutput?: Record<string, unknown>;
}

export interface RobotToolUsage {
  toolId: string;
  toolName: string;
  timestamp: number;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "BLOCKED";
  sanitizedSummary?: string;
}

export interface RobotIdentity {
  robotId: string;
  workerId: string;
  displayName: string;
  role: string;
  description: string;
  avatarKey: string;
  status: RobotStatus;
  workingPhase: RobotWorkingPhase;
  currentOutcomeId?: string;
  currentTask?: string;
  capabilities: string[];
  skills: string[];
  tools: string[];
  recentTools: RobotToolUsage[];
  structuredInput?: RobotStructuredInput;
  structuredOutput?: RobotStructuredOutput;
  verification?: {
    passed: boolean;
    details: string;
    verifier: string;
    verifiedAt: number;
  };
  handoffState?: {
    toRobotId: string;
    toWorkerId: string;
    summary: string;
    timestamp: number;
  };
  lastActiveAt: number;
}

// 3. Robot Structured Communication
export interface RobotMessage {
  messageId: string;
  fromRobotId: string;
  fromRobotName: string;
  toRobotId?: string;
  toRobotName?: string;
  outcomeId: string;
  messageText: string;
  eventType: "STATUS_UPDATE" | "HANDOFF" | "VERIFICATION" | "APPROVAL_REQUEST" | "COMPLETION";
  timestamp: number;
}

