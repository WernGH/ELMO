/**
 * ELMO Phase 3 — Central AI-Native Execution Engine & Dynamic Orchestrator (ElmoOrchestratorService)
 *
 * Coordinates multi-agent dynamic planning, dependency-driven execution (supporting both parallel
 * and sequential steps), bounded retries, loop protection, technical & business verification,
 * interactive human-in-the-loop approval controls, Company Brain memory integration,
 * immutable activity logging, and audit history recording directly underneath ELMO Central Brain.
 */

import {
  AgentMessage,
  AgentResult,
  ExecutionPlan,
  ExecutionStep,
  PlanStatus,
  RiskLevel,
  PendingApprovalDetails,
  ExecutionHistoryRecord,
  CanonicalExecutionObject,
  ExecutionState,
  OutcomeVerificationReport,
  BusinessOutcomeStatus,
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { AgentExecutorService } from "./agent-executor.service";
import { ExecutionHistoryService } from "./execution-history.service";
import { ElmoIntentService, IntentAnalysisResult } from "@/services/elmo-intent.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { ApprovalService } from "@/services/approval.service";
import { ActivityService } from "@/services/activity.service";
import { MemoryEntry } from "@/types/future/memory.types";
import { SkillRegistryService } from "./skill-registry.service";
import { ToolRegistryService } from "./tool-registry.service";
import { OutcomeVerificationService } from "./outcome-verification.service";
import { KnowledgeRetrievalService } from "@/services/knowledge/knowledge-retrieval.service";
import { KnowledgeContext } from "@/types/knowledge.types";
import { DynamicTaskPlannerService } from "./dynamic-task-planner.service";
import { WorkforceRegistryService } from "./workforce-registry.service";
import { WorkerDefinition } from "./types/agentic.types";

export interface OrchestratorInput {
  userId: string;
  organizationId: string;
  conversationId?: string;
  message: string;
  intentAnalysis?: IntentAnalysisResult;
  language?: string;
  companyBrainContext?: Record<string, unknown>;
  requestedOutcome?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  userRole?: string;
  permissions?: string[];
  context?: Record<string, unknown>;
}

export interface OrchestrationResult {
  isDirectAnswer: boolean;
  response: string;
  plan?: ExecutionPlan;
  agentResults: AgentResult[];
  previewPayload?: unknown;
  pendingApproval?: PendingApprovalDetails;
  visualState:
    | "THINKING"
    | "EXECUTING"
    | "SUCCESS"
    | "ERROR"
    | "AWAITING_APPROVAL"
    | "WAITING_FOR_INPUT"
    | "MISSING_CAPABILITY"
    | "UNSUPPORTED_ACTION"
    | "PLAN_VALIDATION_FAILED";
  canonicalExecution?: CanonicalExecutionObject;
  businessOutcomeStatus?: BusinessOutcomeStatus;
  clarificationQuestions?: string[];
}

interface ActiveExecutionState {
  plan: ExecutionPlan;
  input: OrchestratorInput;
  accumulatedContext: Record<string, unknown>;
  completedStepIds: Set<string>;
  startTime: number;
  totalRetries: number;
  replanCount: number;
  agentResults: AgentResult[];
  previewPayload: unknown;
}

export class ElmoOrchestratorService {
  private static instance: ElmoOrchestratorService;
  private registry: AgentRegistryService;
  private executor: AgentExecutorService;
  private intentService: ElmoIntentService;
  private memoryService: ElmoMemoryService;
  private historyService: ExecutionHistoryService;
  private approvalService: ApprovalService;
  private activityService: ActivityService;
  private skillRegistry: SkillRegistryService;
  private toolRegistry: ToolRegistryService;
  private outcomeVerifier: OutcomeVerificationService;
  private knowledgeService: KnowledgeRetrievalService;
  private planner: DynamicTaskPlannerService;
  private workforceRegistry: WorkforceRegistryService;

  // Stored active plans: planId -> ExecutionPlan
  private activePlans: Map<string, ExecutionPlan> = new Map();
  // Stored active executions paused for approval or replan: executionId -> ActiveExecutionState
  private activeExecutions: Map<string, ActiveExecutionState> = new Map();

  private constructor() {
    this.registry = AgentRegistryService.getInstance();
    this.executor = AgentExecutorService.getInstance();
    this.intentService = ElmoIntentService.getInstance();
    this.memoryService = ElmoMemoryService.getInstance();
    this.historyService = ExecutionHistoryService.getInstance();
    this.approvalService = ApprovalService.getInstance();
    this.activityService = ActivityService.getInstance();
    this.skillRegistry = SkillRegistryService.getInstance();
    this.toolRegistry = ToolRegistryService.getInstance();
    this.outcomeVerifier = OutcomeVerificationService.getInstance();
    this.knowledgeService = KnowledgeRetrievalService.getInstance();
    this.planner = DynamicTaskPlannerService.getInstance();
    this.workforceRegistry = WorkforceRegistryService.getInstance();
  }

  public static getInstance(): ElmoOrchestratorService {
    if (!ElmoOrchestratorService.instance) {
      ElmoOrchestratorService.instance = new ElmoOrchestratorService();
    }
    return ElmoOrchestratorService.instance;
  }

  public static resetInstance(): void {
    ElmoOrchestratorService.instance = undefined as any;
  }

  public reset(): void {
    this.activePlans.clear();
    this.activeExecutions.clear();
    this.historyService.reset();
    this.workforceRegistry.reset();
  }

  /**
   * Evaluates whether a user request requires agent delegation or a direct ELMO answer.
   */
  public async orchestrate(input: OrchestratorInput): Promise<OrchestrationResult> {
    const raw = input.message.trim();
    const lower = raw.toLowerCase();

    // 1. Direct Answer Evaluation (Greetings, general smalltalk, high-level questions)
    const isGreeting = /^(hi|hello|hey|salam|assalamualaikum|hai|selamat pagi|greetings|hola)/i.test(raw);
    const isSmallTalk = /^(how are you|who are you|what is your name|apa khabar)/i.test(lower);
    const isDirectExplanation =
      /^(what is|explain|tell me about|terangkan|apakah)/i.test(lower) &&
      !lower.includes("landing page") &&
      !lower.includes("website") &&
      !lower.includes("funnel") &&
      !lower.includes("campaign") &&
      !lower.includes("crm") &&
      !lower.includes("dashboard");

    if (isGreeting || isSmallTalk || isDirectExplanation) {
      return {
        isDirectAnswer: true,
        response: "",
        agentResults: [],
        visualState: "SUCCESS",
      };
    }

    // 2. Intent Analysis
    const intent = input.intentAnalysis || this.intentService.analyzeIntent(raw);

    // 3. Plan Generation (Single Agent vs Multi-Agent via Fast Path or Dynamic Planner)
    const plan = this.createExecutionPlan(input, intent);

    if (
      plan.steps.length === 0 &&
      plan.status !== "WAITING_FOR_INPUT" &&
      plan.status !== "MISSING_CAPABILITY" &&
      (plan.status as string) !== "UNSUPPORTED_ACTION" &&
      plan.status !== "PLAN_VALIDATION_FAILED"
    ) {
      return {
        isDirectAnswer: true,
        response: "",
        agentResults: [],
        visualState: "SUCCESS",
      };
    }

    this.activePlans.set(plan.id, plan);

    // 4. Controlled AI-Native Execution Loop
    return await this.executePlan(plan, input);
  }

  /**
   * Identifies safe, deterministic fast paths (explicit web creation, direct AST modifications, publishing).
   * Open-ended business objectives, diagnostic requests, and complex problems always route to the dynamic planner.
   */
  public isFastPathCandidate(raw: string): boolean {
    const lower = raw.toLowerCase();

    // Any business drop, problem, or strategic inquiry must go to the dynamic planner
    if (
      lower.includes("sales") ||
      lower.includes("revenue") ||
      lower.includes("drop") ||
      lower.includes("dropped") ||
      lower.includes("fell") ||
      lower.includes("fallen") ||
      lower.includes("decline") ||
      lower.includes("declined") ||
      lower.includes("problem") ||
      lower.includes("retention") ||
      lower.includes("renew") ||
      lower.includes("churn") ||
      lower.includes("staying") ||
      lower.includes("abandon") ||
      lower.includes("delay") ||
      lower.includes("delays") ||
      lower.includes("backlog") ||
      lower.includes("overdue") ||
      lower.includes("struggling") ||
      lower.includes("bottleneck") ||
      lower.includes("complain") ||
      lower.includes("look at everything") ||
      lower.includes("most important opportunity")
    ) {
      // Check if it's explicitly a CRM dashboard, admin portal, or direct creation command without problem/drop
      const isExplicitFast =
        lower.includes("crm") ||
        lower.includes("dashboard") ||
        lower.includes("admin portal") ||
        lower.includes("portal") ||
        /\b(create|build|make|generate|bina|buat)\b.*\b(landing page|website|webpage|sales page|funnel)\b/i.test(lower);

      if (
        isExplicitFast &&
        !lower.includes("dropped") &&
        !lower.includes("fell") &&
        !lower.includes("decline") &&
        !lower.includes("declined") &&
        !lower.includes("problem") &&
        !lower.includes("struggling") &&
        !lower.includes("sales have dropped") &&
        !lower.includes("sales dropped")
      ) {
        return true;
      }

      return false;
    }

    const isPublish =
      lower.includes("publish website") ||
      lower.includes("publish the website") ||
      lower.includes("publish page") ||
      lower.includes("deploy live");

    const isAppSpec =
      lower.includes("crm") ||
      lower.includes("dashboard") ||
      lower.includes("admin portal") ||
      lower.includes("internal tool") ||
      lower.includes("sales team portal");

    const isAstEdit =
      lower.includes("make the hero") ||
      lower.includes("change the cta") ||
      lower.includes("dark mode") ||
      lower.includes("more premium") ||
      lower.includes("turn this into an italian") ||
      lower.includes("move testimonials") ||
      lower.includes("shorten the headline");

    const isExplicitWebCreation =
      /\b(create|build|make|generate|bina|buat)\b.*\b(landing page|website|webpage)\b/i.test(lower);

    const isCopyOnly =
      (lower.includes("headline") || lower.includes("copy") || lower.includes("tajuk")) &&
      !isExplicitWebCreation;

    return isPublish || isAppSpec || isAstEdit || isExplicitWebCreation || isCopyOnly;
  }

  /**
   * Plans ordered and parallel-capable steps dynamically based on user outcome and context.
   */
  public createExecutionPlan(input: OrchestratorInput, intent: IntentAnalysisResult): ExecutionPlan {
    const raw = input.message.trim();
    const lower = raw.toLowerCase();
    const planId = `plan-${Date.now()}`;
    const steps: ExecutionStep[] = [];

    // Extract target audience and industry topic dynamically (Priority Rule: Explicit > Company Brain > Generic)
    let targetAudience = "";
    let topic = "Business";

    // 1. Explicit Target Audience extraction from prompt:
    const explicitAudienceMatch = raw.match(/(?:targeting|aimed at|focus on|sasaran|untuk)\s+([^.,\n\r]+)/i);
    if (explicitAudienceMatch && explicitAudienceMatch[1]) {
      const candidate = explicitAudienceMatch[1].trim();
      if (!candidate.toLowerCase().includes("landing page") && !candidate.toLowerCase().includes("my business")) {
        targetAudience = candidate.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // 2. Identify industry / topic:
    if (lower.includes("restaurant") || lower.includes("cafe") || lower.includes("dining") || lower.includes("food") || lower.includes("bistro") || lower.includes("bakery")) {
      topic = "Restaurant";
      if (!targetAudience) targetAudience = "Diners & Food Enthusiasts";
    } else if (lower.includes("insurance") || lower.includes("takaful") || lower.includes("cyber insurance") || lower.includes("policy")) {
      topic = "Insurance";
      if (!targetAudience) targetAudience = "Insurance & Policy Seekers";
    } else if (lower.includes("fitness") || lower.includes("gym") || lower.includes("workout")) {
      topic = "Fitness";
      if (!targetAudience) targetAudience = "Fitness Enthusiasts & Members";
    } else if (lower.includes("saas") || lower.includes("software") || lower.includes("ai business") || lower.includes("ai platform")) {
      topic = "AI & Technology";
      if (!targetAudience) targetAudience = "Modern Tech Teams & Founders";
    } else if (lower.includes("property agent") || lower.includes("real estate") || lower.includes("hartanah")) {
      topic = "Real Estate";
      if (!targetAudience) targetAudience = "Property Buyers & Investors";
    } else if (lower.includes("consult") || lower.includes("coach") || lower.includes("coaching")) {
      topic = "Coaching";
      if (!targetAudience) targetAudience = "Coaching Clients & Leaders";
    } else if (lower.includes("e-commerce") || lower.includes("ecommerce")) {
      topic = "E-Commerce";
      if (!targetAudience) targetAudience = "Online Shoppers";
    }

    if (!targetAudience) {
      targetAudience = "Prospective Clients";
    }

    // Company Brain fallback if topic wasn't explicitly found in user message
    if (topic === "Business" && input.companyBrainContext) {
      const orgName = ((input.companyBrainContext.organization as any)?.name || "").toLowerCase();
      const memories = (input.companyBrainContext.memories as any[]) || [];
      const memoryText = memories.map((m) => m.content || "").join(" ").toLowerCase();
      const combined = `${orgName} ${memoryText}`;

      if (combined.includes("restaurant") || combined.includes("cafe") || combined.includes("bistro") || combined.includes("dining")) {
        topic = "Restaurant";
        targetAudience = "Diners & Food Enthusiasts";
      } else if (combined.includes("insurance") || combined.includes("takaful")) {
        topic = "Insurance";
        targetAudience = "Insurance & Policy Seekers";
      } else if (combined.includes("fitness") || combined.includes("gym")) {
        topic = "Fitness";
        targetAudience = "Fitness Enthusiasts & Members";
      } else if (combined.includes("property") || combined.includes("real estate") || combined.includes("hartanah")) {
        topic = "Real Estate";
        targetAudience = "Property Buyers & Investors";
      } else if (combined.includes("coach") || combined.includes("consult")) {
        topic = "Coaching";
        targetAudience = "Coaching Clients & Leaders";
      }
    }

    // Classification Categories:
    const isPublishOrDeploy =
      lower.includes("publish the website") ||
      lower.includes("publish website") ||
      lower.includes("publish landing page") ||
      lower.includes("publish page") ||
      lower.includes("deploy live") ||
      lower.includes("launch live");

    const isWebApplication =
      lower.includes("crm") ||
      lower.includes("dashboard") ||
      lower.includes("customer portal") ||
      lower.includes("admin portal") ||
      lower.includes("internal tool") ||
      lower.includes("web app") ||
      lower.includes("web application") ||
      lower.includes("sales team portal") ||
      (lower.includes("sales team") && lower.includes("dashboard"));

    const isWebEdit =
      lower.includes("make the hero") ||
      lower.includes("change the cta") ||
      lower.includes("make this mobile") ||
      lower.includes("move testimonials") ||
      lower.includes("shorten the headline") ||
      lower.includes("add a lead form") ||
      lower.includes("more premium") ||
      lower.includes("dark mode") ||
      lower.includes("turn this into an italian") ||
      lower.includes("pivot to") ||
      lower.includes("rollback to");

    const isFullWebCreation =
      /\b(create|build|make|generate|design|launch|bina|buat)\b.*\b(landing page|website|webpage|sales page|funnel page)\b/i.test(lower) ||
      (lower.includes("landing page") && (lower.includes("create") || lower.includes("build") || lower.includes("make") || lower.includes("bina") || lower.includes("buat"))) ||
      lower.includes("build me a landing page") ||
      lower.includes("create me a landing page") ||
      lower.includes("create a landing page") ||
      lower.includes("build a website") ||
      lower.includes("build a complete website") ||
      lower.includes("create a website") ||
      lower.includes("bina landing page") ||
      lower.includes("buat landing page");

    const isCopyOnly =
      (lower.includes("headline") || lower.includes("copy") || lower.includes("tajuk")) &&
      !isFullWebCreation &&
      !isWebEdit &&
      !isWebApplication &&
      !lower.includes("campaign") &&
      !lower.includes("lead generation");

    const isAnalyticsOnly =
      lower.includes("analytics") ||
      lower.includes("metric") ||
      lower.includes("conversion rate") ||
      lower.includes("drop-off");

    const isLeadGenCampaign =
      (lower.includes("launch a lead generation campaign") ||
        lower.includes("create a campaign to get more leads") ||
        lower.includes("lead generation campaign") ||
        lower.includes("get me more qualified leads") ||
        lower.includes("get more qualified leads") ||
        lower.includes("campaign for my business") ||
        lower.includes("kempen jana leads") ||
        (lower.includes("campaign") && (lower.includes("lead") || lower.includes("targeting") || lower.includes("buyers") || lower.includes("promotion")))) &&
      !isCopyOnly &&
      !isAnalyticsOnly;

    const isCompetitorLandingPage =
      lower.includes("competitor") &&
      (lower.includes("landing page") || lower.includes("page") || lower.includes("website"));

    // Specific Business Vertical Classification Scenarios (Section 37)
    const isRestaurantPromotion =
      (topic === "Restaurant" || lower.includes("restaurant") || lower.includes("cafe") || lower.includes("bistro")) &&
      (lower.includes("promotion") || lower.includes("weekend") || lower.includes("offer") || lower.includes("special") || lower.includes("diners"));

    const isInsuranceQuotationAnalysis =
      (topic === "Insurance" || lower.includes("insurance") || lower.includes("quotation") || lower.includes("quote")) &&
      (lower.includes("slow") || lower.includes("delay") || lower.includes("follow-up is slow") || lower.includes("follow-up is") || lower.includes("turnaround"));

    const isPropertyLeadFollowup =
      (topic === "Real Estate" || lower.includes("property") || lower.includes("hartanah")) &&
      (lower.includes("follow-up plan") || lower.includes("follow up plan") || lower.includes("new leads") || lower.includes("viewing"));

    const isSaaSTrialAnalysis =
      (topic === "AI & Technology" || lower.includes("saas") || lower.includes("software")) &&
      (lower.includes("trial") || lower.includes("activated") || lower.includes("activation") || lower.includes("churn"));

    const isCoachingBookingPage =
      (topic === "Coaching" || lower.includes("coaching") || lower.includes("consultation")) &&
      (lower.includes("booking page") || (lower.includes("consultation") && lower.includes("page")) || lower.includes("book a consultation") || lower.includes("for my consultation"));

    const isEcommerceAbandonedCarts =
      lower.includes("abandoned cart") || lower.includes("abandoned carts") || lower.includes("checkout drop") || lower.includes("cart drop");

    const isAgencyClientPriorities =
      lower.includes("agency") ||
      lower.includes("client priorities") ||
      lower.includes("client priority") ||
      lower.includes("today's client") ||
      lower.includes("client deliverables") ||
      (lower.includes("client") && lower.includes("priorities"));

    const isServiceCustomerFollowups =
      (lower.includes("service") || lower.includes("job") || lower.includes("contractor") || lower.includes("enquiry")) &&
      (lower.includes("customer follow-up") || lower.includes("customer follow-ups") || lower.includes("customer follow ups") || lower.includes("organize today"));

    const isHighRiskDestructive =
      lower.includes("delete all") ||
      lower.includes("production database") ||
      lower.includes("mass email") ||
      lower.includes("drop table");

    const isExplicitFunnel =
      /\b(create|build|make|set up|setup|launch|bina|buatkan|buat)\b.*\bfunnel\b/i.test(lower) &&
      !lower.includes("landing page") &&
      !lower.includes("website") &&
      !lower.includes("dropped") &&
      !lower.includes("fell") &&
      !lower.includes("problem");

    // Formulate Steps:
    if (isHighRiskDestructive) {
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "funnel-agent",
        agentName: "Funnel Agent",
        task: raw,
        dependencies: [],
        status: "PENDING",
        riskLevel: "HIGH",
        approvalRequired: true,
        skills: ["Qualify", "Create"],
        tools: ["create_funnel"],
        input: { message: raw, topic },
        maxRetries: 2,
      });
    } else if (isExplicitFunnel) {
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "funnel-agent",
        agentName: "Funnel Agent",
        task: raw,
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Qualify", "Create"],
        tools: ["create_funnel"],
        input: { message: raw, topic, targetAudience },
        maxRetries: 2,
      });
    } else if (isPublishOrDeploy) {
      // High-risk publishing: Requires explicit approval
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "web-coding-agent",
        agentName: "Web/Coding Agent",
        task: `Publish landing page publicly to live domain /p/[slug]`,
        dependencies: [],
        status: "PENDING",
        riskLevel: "HIGH",
        approvalRequired: true,
        skills: ["Build", "Verify"],
        tools: ["publish_page"],
        input: { message: raw, publish: true, topic },
        maxRetries: 1,
      });
    } else if (isWebApplication) {
      // 10-step Application Specification and Interactive Prototype
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "web-coding-agent",
        agentName: "Web/Coding Agent",
        task: `Generate 10-step software architecture specification and interactive prototype for: ${raw}`,
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Design", "Build", "Code", "Verify"],
        tools: ["BUILD_PROJECT", "PREVIEW_PROJECT", "VALIDATE_CODE"],
        input: { message: raw, projectType: "CRM / Dashboard Application", topic, targetAudience },
        maxRetries: 2,
      });
    } else if (isWebEdit) {
      // Natural Language AST Modification
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "web-coding-agent",
        agentName: "Web/Coding Agent",
        task: raw,
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Design", "Optimize", "Code"],
        tools: ["CODE_MODIFY", "UPDATE_SECTION", "PREVIEW_PROJECT"],
        input: { message: raw, topic },
        maxRetries: 2,
      });
    } else if (isRestaurantPromotion) {
      // Scenario 1: Restaurant Promotion Workflow
      steps.push(
        {
          id: "step-1",
          stepNumber: 1,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: `Define weekend promotion and offer architecture for restaurant diners`,
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Create", "Recommend"],
          tools: ["create_offer_blueprint", "store_memory"],
          input: { targetAudience: "Diners & Food Enthusiasts", businessType: "Restaurant", topic: "Restaurant Weekend Promotion" },
          maxRetries: 2,
        },
        {
          id: "step-2",
          stepNumber: 2,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: `Draft promotional announcement copy and customer invitation for restaurant weekend offer`,
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Communicate"],
          tools: ["generate_copy_variants"],
          input: { targetAudience: "Diners & Food Enthusiasts", topic: "Weekend Promotion Announcement" },
          maxRetries: 2,
        }
      );
    } else if (isInsuranceQuotationAnalysis) {
      // Scenario 2: Insurance Quotation Delay Analysis
      steps.push({
        id: "step-1",
        stepNumber: 1,
        agentId: "analytics-agent",
        agentName: "Analytics Agent",
        task: "Analyze insurance quotation response bottlenecks, drop-offs, and follow-up delays",
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Analyze", "Audit", "Report", "Recommend"],
        tools: ["get_funnel_analytics", "query_memory"],
        input: { message: raw, industry: "Insurance", metricFocus: "Quotation Turnaround" },
        maxRetries: 2,
      });
    } else if (isPropertyLeadFollowup) {
      // Scenario 3: Property Lead Follow-up Cadence
      steps.push(
        {
          id: "step-1",
          stepNumber: 1,
          agentId: "funnel-agent",
          agentName: "Funnel Agent",
          task: "Prepare multi-touch follow-up cadence and viewing schedule for property leads",
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Qualify", "Follow Up"],
          tools: ["create_funnel", "store_memory"],
          input: { targetAudience: "Property Buyers & Investors", topic: "Property Lead Follow-up" },
          maxRetries: 2,
        },
        {
          id: "step-2",
          stepNumber: 2,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: "Draft lead follow-up messages and viewing invitations",
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Communicate"],
          tools: ["generate_copy_variants"],
          input: { targetAudience: "Property Buyers & Investors", topic: "Viewing Invitation" },
          maxRetries: 2,
        }
      );
    } else if (isSaaSTrialAnalysis) {
      // Scenario 4: SaaS Trial Activation Analysis
      steps.push(
        {
          id: "step-1",
          stepNumber: 1,
          agentId: "analytics-agent",
          agentName: "Analytics Agent",
          task: "Analyze SaaS trial user onboarding drop-offs, activation barriers, and engagement metrics",
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Analyze", "Audit", "Forecast", "Recommend"],
          tools: ["get_dashboard_analytics", "query_memory"],
          input: { message: raw, industry: "SaaS", focusMetric: "Trial Activation" },
          maxRetries: 2,
        },
        {
          id: "step-2",
          stepNumber: 2,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: "Recommend activation triggers and in-app onboarding improvements",
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Optimize"],
          tools: ["store_memory"],
          input: { targetAudience: "Trial Users", topic: "SaaS Activation Strategy" },
          maxRetries: 2,
        }
      );
    } else if (isCoachingBookingPage) {
      // Scenario 5: Coaching Consultation Booking Page
      steps.push(
        {
          id: "step-1",
          stepNumber: 1,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: "Define executive consultation offer and client qualification criteria",
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Qualify"],
          tools: ["create_offer_blueprint", "store_memory"],
          input: { targetAudience: "Coaching Clients & Leaders", businessType: "Coaching", topic: "Consultation Offer" },
          maxRetries: 2,
        },
        {
          id: "step-2",
          stepNumber: 2,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: "Draft consultation booking page copy and value propositions",
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Communicate"],
          tools: ["generate_copy_variants"],
          input: { targetAudience: "Coaching Clients & Leaders", topic: "Consultation Booking Copy" },
          maxRetries: 2,
        },
        {
          id: "step-3",
          stepNumber: 3,
          agentId: "web-coding-agent",
          agentName: "Web/Coding Agent",
          task: "Build, style, and validate the consultation booking page with interactive form",
          dependencies: ["step-2"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Design", "Build", "Create", "Verify"],
          tools: ["CREATE_PAGE", "CREATE_SECTION", "VALIDATE_CODE", "PREVIEW_PROJECT"],
          input: { targetAudience: "Coaching Clients & Leaders", topic: "Consultation Booking Page" },
          maxRetries: 2,
        }
      );
    } else if (isEcommerceAbandonedCarts) {
      // Scenario 6: Ecommerce Abandoned Cart Analysis & Recovery
      steps.push(
        {
          id: "step-1",
          stepNumber: 1,
          agentId: "analytics-agent",
          agentName: "Analytics Agent",
          task: "Analyze ecommerce checkout abandonment rates, exit stages, and friction points",
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Analyze", "Audit", "Recommend"],
          tools: ["get_funnel_analytics", "query_memory"],
          input: { message: raw, industry: "Ecommerce", focusMetric: "Cart Abandonment" },
          maxRetries: 2,
        },
        {
          id: "step-2",
          stepNumber: 2,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: "Draft abandoned cart recovery email copy and urgency triggers",
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Follow Up"],
          tools: ["generate_copy_variants"],
          input: { targetAudience: "Online Shoppers", topic: "Cart Recovery Email" },
          maxRetries: 2,
        }
      );
    } else if (isAgencyClientPriorities) {
      // Scenario 7: Agency Client Deliverables & Priorities
      steps.push(
        {
          id: "step-1",
          stepNumber: 1,
          agentId: "research-agent",
          agentName: "Research Agent",
          task: "Review active client accounts, milestone deliverables, and urgent bottlenecks",
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Audit", "Summarize"],
          tools: ["query_memory"],
          input: { topic: "Agency Client Accounts Audit" },
          maxRetries: 2,
        },
        {
          id: "step-2",
          stepNumber: 2,
          agentId: "funnel-agent",
          agentName: "Funnel Agent",
          task: "Compile prioritized daily client action roadmap and team task assignments",
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Schedule", "Report"],
          tools: ["store_memory"],
          input: { message: "Compile daily client priorities and roadmap" },
          maxRetries: 2,
        }
      );
    } else if (isServiceCustomerFollowups) {
      // Scenario 8: Service Business Customer Follow-ups
      steps.push(
        {
          id: "step-1",
          stepNumber: 1,
          agentId: "funnel-agent",
          agentName: "Funnel Agent",
          task: "Organize customer follow-up schedule and pending job confirmations",
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Qualify", "Follow Up", "Schedule"],
          tools: ["store_memory"],
          input: { message: "Organize service customer follow-up schedule" },
          maxRetries: 2,
        },
        {
          id: "step-2",
          stepNumber: 2,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: "Draft customer check-in and booking confirmation notifications",
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Communicate"],
          tools: ["generate_copy_variants"],
          input: { targetAudience: "Service Customers", topic: "Job Booking Confirmation" },
          maxRetries: 2,
        }
      );
    } else if (isCopyOnly) {
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "copy-agent",
        agentName: "Copy Agent",
        task: `Generate conversion headlines and tailored copy for ${topic}`,
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Write", "Summarize", "Communicate"],
        tools: ["generate_copy_variants"],
        input: { topic: raw, targetAudience, industry: topic },
        maxRetries: 2,
      });
    } else if (isAnalyticsOnly) {
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "analytics-agent",
        agentName: "Analytics Agent",
        task: "Analyze conversion funnel metrics and recommend optimizations",
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Analyze", "Audit", "Report", "Recommend"],
        tools: ["get_funnel_analytics", "query_memory"],
        input: { message: raw },
        maxRetries: 2,
      });
    } else if (isLeadGenCampaign) {
      // Multi-Agent Workflow: Research & Marketing in parallel -> Copy -> Web/Coding -> Funnel
      steps.push(
        {
          id: `step-1`,
          stepNumber: 1,
          agentId: "research-agent",
          agentName: "Research Agent",
          task: `Analyze audience pain points, objections, and market intelligence for ${targetAudience}`,
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Research", "Analyze"],
          tools: ["search_knowledge", "query_memory"],
          input: { targetAudience, topic: `${topic} Lead Generation` },
          maxRetries: 2,
        },
        {
          id: `step-2`,
          stepNumber: 2,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: `Define positioning, value proposition, and campaign offer strategy for ${targetAudience}`,
          dependencies: [], // Can run in parallel with step-1
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Create", "Recommend"],
          tools: ["store_memory"],
          input: { targetAudience, businessType: topic, topic },
          maxRetries: 2,
        },
        {
          id: `step-3`,
          stepNumber: 3,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: `Draft conversion headlines, benefits, and call-to-actions tailored for ${targetAudience}`,
          dependencies: ["step-1", "step-2"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Communicate"],
          tools: ["generate_copy_variants"],
          input: { targetAudience, topic },
          maxRetries: 2,
        },
        {
          id: `step-4`,
          stepNumber: 4,
          agentId: "web-coding-agent",
          agentName: "Web/Coding Agent",
          task: `Build, style, and validate the responsive landing page for ${targetAudience}`,
          dependencies: ["step-3"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Design", "Build", "Code", "Verify"],
          tools: ["CREATE_PAGE", "PREVIEW_PROJECT"],
          input: { targetAudience, topic },
          maxRetries: 2,
        },
        {
          id: `step-5`,
          stepNumber: 5,
          agentId: "funnel-agent",
          agentName: "Funnel Agent",
          task: `Connect lead qualification and capture flow for ${targetAudience}`,
          dependencies: ["step-4"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Qualify", "Create"],
          tools: ["create_funnel"],
          input: { message: `Create lead generation funnel for ${targetAudience}` },
          maxRetries: 2,
        }
      );
    } else if (isCompetitorLandingPage) {
      steps.push(
        {
          id: `step-1`,
          stepNumber: 1,
          agentId: "research-agent",
          agentName: "Research Agent",
          task: `Conduct competitor gap analysis and market research for ${targetAudience}`,
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Research", "Compare"],
          tools: ["search_knowledge"],
          input: { targetAudience, topic },
          maxRetries: 2,
        },
        {
          id: `step-2`,
          stepNumber: 2,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: `Differentiate unique angle against competitors for ${targetAudience}`,
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Create"],
          tools: ["store_memory"],
          input: { targetAudience, businessType: topic, topic },
          maxRetries: 2,
        },
        {
          id: `step-3`,
          stepNumber: 3,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: `Draft high-converting competitive comparison copy for ${targetAudience}`,
          dependencies: ["step-2"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Communicate"],
          tools: ["generate_copy_variants"],
          input: { targetAudience, topic },
          maxRetries: 2,
        },
        {
          id: `step-4`,
          stepNumber: 4,
          agentId: "web-coding-agent",
          agentName: "Web/Coding Agent",
          task: `Build, style, and validate the competitive landing page for ${targetAudience}`,
          dependencies: ["step-3"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Design", "Build", "Code", "Verify"],
          tools: ["CREATE_PAGE", "PREVIEW_PROJECT"],
          input: { targetAudience, topic },
          maxRetries: 2,
        }
      );
    } else if (isFullWebCreation) {
      // Dynamic multi-agent web creation: Marketing -> Copy -> Web/Coding -> Funnel
      steps.push(
        {
          id: `step-1`,
          stepNumber: 1,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: `Define positioning and offer strategy for ${targetAudience}`,
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Create"],
          tools: ["store_memory"],
          input: { targetAudience, businessType: topic, topic },
          maxRetries: 2,
        },
        {
          id: `step-2`,
          stepNumber: 2,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: `Draft high-converting headline, subheadline, and benefits for ${targetAudience}`,
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Write", "Communicate"],
          tools: ["generate_copy_variants"],
          input: { targetAudience, topic },
          maxRetries: 2,
        },
        {
          id: `step-3`,
          stepNumber: 3,
          agentId: "web-coding-agent",
          agentName: "Web/Coding Agent",
          task: `Build, style, and validate the responsive web experience for ${targetAudience}`,
          dependencies: ["step-2"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Design", "Build", "Code", "Verify"],
          tools: ["CREATE_PAGE", "PREVIEW_PROJECT"],
          input: { targetAudience, topic },
          maxRetries: 2,
        },
        {
          id: `step-4`,
          stepNumber: 4,
          agentId: "funnel-agent",
          agentName: "Funnel Agent",
          task: `Connect web experience to lead qualification and conversion flow`,
          dependencies: ["step-3"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Qualify", "Create"],
          tools: ["create_funnel"],
          input: { message: `Connect conversion flow for ${targetAudience}` },
          maxRetries: 2,
        }
      );
    } else {
      // Dynamic AI Task Decomposition (Replaces hardcoded generic funnel fallback)
      const plannerResult = this.planner.planSync({
        userId: input.userId,
        organizationId: input.organizationId,
        objective: raw,
        conversationId: input.conversationId,
        companyBrainContext: input.companyBrainContext,
        memories: input.companyBrainContext?.memories as any,
        userRole: input.userRole,
        permissions: input.permissions,
      });
      return plannerResult.plan;
    }

    const selectedSkills = Array.from(
      new Set([
        ...steps.flatMap((s) => s.skills || []),
        ...this.skillRegistry.findSkillsForGoal(raw).map((s) => s.name),
      ])
    );
    const selectedTools = Array.from(
      new Set(steps.flatMap((s) => s.tools || []))
    );

    return {
      id: planId,
      executionId: `exec-${Date.now()}`,
      organizationId: input.organizationId,
      userId: input.userId,
      objective: raw,
      steps,
      selectedSkills,
      selectedTools,
      currentStepIndex: 0,
      status: "CREATED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Executes a plan dynamically with loop protection, parallel execution, verification,
   * bounded retries, interactive approval gates, and durable learning.
   */
  public async executePlan(plan: ExecutionPlan, input: OrchestratorInput): Promise<OrchestrationResult> {
    const startTime = Date.now();

    // 0. Ambiguity / Missing Information Gate (WAITING_FOR_INPUT)
    if (plan.status === "WAITING_FOR_INPUT") {
      const questionsText =
        plan.clarificationQuestions && plan.clarificationQuestions.length > 0
          ? plan.clarificationQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")
          : "Please provide additional details regarding your business domain, current metrics, and specific operational challenges.";

      const response =
        `To formulate an accurate, high-leverage execution plan for **"${plan.objective}"**, I require clarification on a few critical business specifics:\n\n` +
        `${questionsText}\n\n` +
        `Once you provide these details, I will dynamically construct and execute the appropriate multi-agent workflow.`;

      this.activeExecutions.set(plan.executionId, {
        plan,
        input,
        accumulatedContext: { ...input.companyBrainContext },
        completedStepIds: new Set<string>(),
        startTime,
        totalRetries: 0,
        replanCount: 0,
        agentResults: [],
        previewPayload: null,
      });

      const canonical = this.logExecutionHistory(
        plan,
        input,
        startTime,
        0,
        [],
        null,
        response,
        "WAITING_FOR_INPUT"
      );

      return {
        isDirectAnswer: false,
        response,
        plan,
        agentResults: [],
        visualState: "WAITING_FOR_INPUT",
        canonicalExecution: canonical,
        businessOutcomeStatus: "WAITING_FOR_INPUT",
        clarificationQuestions: plan.clarificationQuestions,
      };
    }

    // 0b. Capability Gate: Missing Capability / Unsupported Action (MISSING_CAPABILITY)
    if (plan.status === "MISSING_CAPABILITY" || (plan.status as string) === "UNSUPPORTED_ACTION") {
      const missingList =
        plan.missingCapabilities?.join(", ") ||
        plan.unsupportedCapabilities?.join(", ") ||
        "external capability";

      const response =
        `ELMO Capability Guard: Cannot execute **"${plan.objective}"** because the requested capability (**${missingList}**) is not supported by our current tool and agent registries.\n\n` +
        `Available capabilities in this operating system include:\n` +
        `- Responsive web and landing page architecture\n` +
        `- Marketing and offer strategy formulation\n` +
        `- Funnel conversion and activation optimization\n` +
        `- Conversion copywriting and messaging variants\n` +
        `- Operational performance, funnel, and dashboard analytics\n` +
        `- Company Brain and RAG knowledge retrieval\n\n` +
        `No dummy or unrelated tools were executed.`;

      const canonical = this.logExecutionHistory(
        plan,
        input,
        startTime,
        0,
        [],
        null,
        response,
        "MISSING_CAPABILITY"
      );

      return {
        isDirectAnswer: false,
        response,
        plan,
        agentResults: [],
        visualState: "MISSING_CAPABILITY",
        canonicalExecution: canonical,
        businessOutcomeStatus: "MISSING_CAPABILITY",
      };
    }

    // 0c. Plan Validation Gate (PLAN_VALIDATION_FAILED)
    if (plan.status === "PLAN_VALIDATION_FAILED") {
      const response = `ELMO Security Guard: Execution halted because the proposed plan failed strict capability and registry validation: ${plan.summary || "Invalid tools or agents detected"}.`;

      const canonical = this.logExecutionHistory(
        plan,
        input,
        startTime,
        0,
        [],
        null,
        response,
        "PLAN_VALIDATION_FAILED"
      );

      return {
        isDirectAnswer: false,
        response,
        plan,
        agentResults: [],
        visualState: "PLAN_VALIDATION_FAILED",
        canonicalExecution: canonical,
        businessOutcomeStatus: "PLAN_VALIDATION_FAILED",
      };
    }

    // 0d. Phase 4.0.1 Pre-Flight Workforce Health Check & Readiness Diagnostic
    const preFlight = this.workforceRegistry.conductPreFlightCheck({
      plan,
      organizationId: input.organizationId,
      userId: input.userId,
      userRole: input.userRole,
      userPermissions: input.permissions,
    });

    if (preFlight.overall === "BLOCKED") {
      const explanation = preFlight.explanation;

      if (preFlight.healthState === "DEPENDENCY_FAILURE") {
        plan.status = "FAILED";
        const deadlockRes = `ELMO Orchestrator: Dependency resolution failed. Unresolved task prerequisites detected. ${explanation.why}`;
        const canonical = this.logExecutionHistory(plan, input, startTime, 0, [], null, deadlockRes, "FAILED");
        return {
          isDirectAnswer: false,
          response: deadlockRes,
          plan,
          agentResults: [],
          visualState: "ERROR",
          canonicalExecution: canonical,
          businessOutcomeStatus: "FAILED",
        };
      }

      const whatICanDoText = explanation.whatICanDo.length > 0 ? explanation.whatICanDo.map((item) => `- ${item}`).join("\n") : "- None";
      const whatICannotDoText = explanation.whatICannotDo.length > 0 ? explanation.whatICannotDo.map((item) => `- ${item}`).join("\n") : "- None";
      const whatIsMissingText = explanation.whatIsMissing.length > 0 ? explanation.whatIsMissing.map((item) => `- ${item}`).join("\n") : "- None";
      const nextStepsText = explanation.whatCanHappenNext.length > 0 ? explanation.whatCanHappenNext.map((item) => `- ${item}`).join("\n") : "- None";

      const response =
        `### ELMO Workforce Readiness: BLOCKED\n\n` +
        `**WHY:**\n${explanation.why}\n\n` +
        `**WHAT I CAN DO:**\n${whatICanDoText}\n\n` +
        `**WHAT I CANNOT DO:**\n${whatICannotDoText}\n\n` +
        `**WHAT IS MISSING:**\n${whatIsMissingText}\n\n` +
        `**WHAT CAN HAPPEN NEXT:**\n${nextStepsText}`;

      // Emit learning signal
      await this.workforceRegistry.emitLearningSignal({
        signalType: preFlight.healthState === "MISSING_TOOL" ? "MISSING_TOOL" : "MISSING_CAPABILITY",
        organizationId: input.organizationId,
        executionId: plan.executionId,
        taskId: plan.id,
        payload: { blockers: preFlight.blockers, readiness: preFlight },
      });

      const canonical = this.logExecutionHistory(
        plan,
        input,
        startTime,
        0,
        [],
        null,
        response,
        preFlight.healthState === "MISSING_TOOL" ? "MISSING_CAPABILITY" : (preFlight.healthState as any)
      );

      return {
        isDirectAnswer: false,
        response,
        plan,
        agentResults: [],
        visualState: "MISSING_CAPABILITY",
        canonicalExecution: canonical,
        businessOutcomeStatus: "MISSING_CAPABILITY",
      };
    }

    // 1. Ingest Company Brain memories into shared execution context
    let existingMemories: MemoryEntry[] = [];
    try {
      existingMemories = await this.memoryService.searchRelevantMemory(
        input.organizationId,
        plan.objective,
        "organization",
        3
      );
    } catch {
      // Non-blocking
    }

    // 2. Goal-Aware Knowledge Retrieval (RAG)
    // Only query knowledge base when the objective or plan requires grounded document context
    const lowerGoal = (plan.objective || "").toLowerCase();
    const hasKnowledgeTool = plan.steps.some(
      (s) => s.tools?.includes("search_knowledge") || s.skills?.includes("Research")
    );
    const hasKnowledgeKeywords =
      lowerGoal.includes("sop") ||
      lowerGoal.includes("policy") ||
      lowerGoal.includes("document") ||
      lowerGoal.includes("guideline") ||
      lowerGoal.includes("manual") ||
      lowerGoal.includes("handbook") ||
      lowerGoal.includes("faq") ||
      lowerGoal.includes("pricing") ||
      lowerGoal.includes("contract") ||
      lowerGoal.includes("knowledge") ||
      lowerGoal.includes("rag") ||
      lowerGoal.includes("retrieve") ||
      lowerGoal.includes("cite") ||
      lowerGoal.includes("provenance") ||
      lowerGoal.includes("research") ||
      lowerGoal.includes("competitor") ||
      lowerGoal.includes("standard operating procedure") ||
      lowerGoal.includes("according to our") ||
      lowerGoal.includes("based on our") ||
      lowerGoal.includes("brochure") ||
      lowerGoal.includes("reference") ||
      lowerGoal.includes("spec") ||
      lowerGoal.includes("guide");
    const isExplicitlyRequired = (input.companyBrainContext?.knowledgeRequired as boolean) === true;

    let knowledgeContext: KnowledgeContext | undefined;
    if (hasKnowledgeTool || hasKnowledgeKeywords || isExplicitlyRequired) {
      try {
        knowledgeContext = await this.knowledgeService.retrieve({
          query: plan.objective,
          organizationId: input.organizationId,
          topK: 4,
          minScore: 0.20,
        });
        if (knowledgeContext && knowledgeContext.chunks.length > 0) {
          plan.knowledgeContext = knowledgeContext;
        }
      } catch {
        // Non-blocking
      }
    }

    const accumulatedContext: Record<string, unknown> = {
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
      companyBrainMemories: existingMemories.map((m) => m.content),
      knowledgeContext,
      ...input.companyBrainContext,
    };

    const executionState: ActiveExecutionState = {
      plan,
      input,
      accumulatedContext,
      completedStepIds: new Set<string>(),
      startTime,
      totalRetries: 0,
      replanCount: 0,
      agentResults: [],
      previewPayload: null,
    };

    return await this.executePlanInternal(executionState);
  }

  /**
   * Internal execution loop supporting resumption after approval or replanning.
   */
  private async executePlanInternal(state: ActiveExecutionState): Promise<OrchestrationResult> {
    const { plan, input, accumulatedContext, completedStepIds, startTime } = state;
    const MAX_HOPS = 10;
    const MAX_EXECUTION_TIME_MS = 35000;
    let hops = 0;

    plan.status = "EXECUTING";

    while (completedStepIds.size < plan.steps.length) {
      hops++;

      // Loop Protection: Hop Limit
      if (hops > MAX_HOPS) {
        plan.status = "FAILED";
        const timeoutRes = "ELMO Safety Guard: Execution halted because the task exceeded maximum allowed agent hops.";
        this.logExecutionHistory(plan, input, startTime, state.totalRetries, state.agentResults, state.previewPayload, timeoutRes, "FAILED");
        return {
          isDirectAnswer: false,
          response: timeoutRes,
          plan,
          agentResults: state.agentResults,
          visualState: "ERROR",
        };
      }

      // Loop Protection: Timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        plan.status = "FAILED";
        const timeoutRes = "ELMO Safety Guard: Execution halted because task exceeded maximum execution time.";
        this.logExecutionHistory(plan, input, startTime, state.totalRetries, state.agentResults, state.previewPayload, timeoutRes, "FAILED");
        return {
          isDirectAnswer: false,
          response: timeoutRes,
          plan,
          agentResults: state.agentResults,
          visualState: "ERROR",
        };
      }

      // Find ready steps
      const readySteps = plan.steps.filter((s) => {
        if (completedStepIds.has(s.id) || s.status === "COMPLETED") return false;
        return s.dependencies.every((depId) => completedStepIds.has(depId));
      });

      if (readySteps.length === 0) {
        plan.status = "FAILED";
        const deadlockRes = "ELMO Orchestrator: Dependency resolution failed. Unresolved task prerequisites detected.";
        this.logExecutionHistory(plan, input, startTime, state.totalRetries, state.agentResults, state.previewPayload, deadlockRes, "FAILED");
        return {
          isDirectAnswer: false,
          response: deadlockRes,
          plan,
          agentResults: state.agentResults,
          visualState: "ERROR",
        };
      }

      // High-Risk Approval Gate Check
      const highRiskStep = readySteps.find((s) => s.approvalRequired);
      if (highRiskStep) {
        plan.status = "WAITING_FOR_APPROVAL";
        highRiskStep.status = "AWAITING_APPROVAL";

        let approvalId = `appr-${Date.now()}`;
        try {
          const approvalRecord = await this.approvalService.requestApproval({
            organizationId: input.organizationId,
            executionId: plan.executionId,
            stepId: highRiskStep.id,
            action: highRiskStep.task,
            requestedBy: highRiskStep.agentName,
            category: "execution",
            riskLevel: highRiskStep.riskLevel === "HIGH" ? "High" : "Medium",
            details: `Approval required before executing: "${highRiskStep.task}".`,
            proposedChanges: highRiskStep.input,
          });
          approvalId = approvalRecord.id;
        } catch {
          // Safe fallback
        }

        const pendingDetails: PendingApprovalDetails = {
          approvalId,
          stepId: highRiskStep.id,
          agentId: highRiskStep.agentId,
          actionTitle: highRiskStep.task,
          description: `This action is classified as HIGH RISK and requires your explicit approval before execution.`,
          riskLevel: highRiskStep.riskLevel,
          proposedChanges: highRiskStep.input,
          requestedAt: Date.now(),
        };
        plan.approvalRequirements = pendingDetails;

        // Persist active state so approval buttons can resume execution
        this.activeExecutions.set(plan.executionId, state);

        const approvalResponse = `Approval required before proceeding with step "${highRiskStep.task}". Please review and select [Approve & Proceed], [Modify], or [Cancel].`;
        this.logExecutionHistory(plan, input, startTime, state.totalRetries, state.agentResults, state.previewPayload, approvalResponse, "WAITING_FOR_APPROVAL");

        return {
          isDirectAnswer: false,
          response: approvalResponse,
          plan,
          agentResults: state.agentResults,
          pendingApproval: pendingDetails,
          visualState: "AWAITING_APPROVAL",
        };
      }

      // Execute Ready Steps (Parallel execution where steps are independent)
      const stepExecutionPromises = readySteps.map(async (step) => {
        step.status = "EXECUTING";
        step.startedAt = Date.now();
        const maxRetries = step.maxRetries ?? 2;
        step.retryCount = step.retryCount ?? 0;

        // Phase 4: Assign worker in Workforce Registry & Log Activity
        this.workforceRegistry.assignWorker({
          workerId: step.agentId,
          taskId: step.id,
          executionId: plan.executionId,
          organizationId: input.organizationId,
        });

        // Phase 4.0.1: Meter worker execution with CostResourceGovernor
        this.workforceRegistry.getCostGovernor().trackWorkerExecution(plan.executionId, step.agentId, input.organizationId);

        // Phase 4: Emit Structured Worker Handoff Contract for Dependent Tasks
        if (step.dependencies && step.dependencies.length > 0) {
          for (const depId of step.dependencies) {
            const depStep = plan.steps.find((s) => s.id === depId);
            if (depStep) {
              this.workforceRegistry.createWorkerHandoff({
                fromWorkerId: depStep.agentId,
                toWorkerId: step.agentId,
                executionId: plan.executionId,
                taskId: step.id,
                reason: `Sequential dependency handoff from ${depStep.agentName} to ${step.agentName}`,
                objective: step.task,
                completedWork: depStep.summary || `Completed ${depStep.task}`,
                requiredNextAction: step.task,
                inputs: step.input || {},
                outputs: (depStep.output as Record<string, unknown>) || {},
                evidence: [],
                assumptions: [],
                limitations: [],
                verificationStatus: "PASSED",
                organizationId: input.organizationId,
              });
            }
          }
        }

        let lastResult: AgentResult | null = null;

        while (step.retryCount <= maxRetries) {
          const agentMsg: AgentMessage = {
            messageId: `msg-${Date.now()}-${step.id}`,
            executionId: plan.executionId,
            sender: "elmo-orchestrator",
            recipient: step.agentId,
            messageType: "TASK_REQUEST",
            task: step.task,
            context: accumulatedContext,
            input: { ...step.input, ...accumulatedContext },
            timestamp: Date.now(),
          };

          try {
            const result = await this.executor.executeAgent(agentMsg);
            lastResult = result;

            // Strict Verification: Check both technical and business success
            const verification = this.verifyStepOutput(step, result, accumulatedContext);
            if (result.success && verification.valid) {
              step.status = "COMPLETED";
              step.completedAt = Date.now();
              step.output = result.data;
              step.summary = result.summary;

              this.workforceRegistry.releaseWorker({
                workerId: step.agentId,
                taskId: step.id,
                success: true,
                durationMs: Date.now() - step.startedAt,
              });

              // Phase 4.0.1: Standardized Artifact Creation for structured worker work product
              try {
                let artifactType: any = "CUSTOM";
                if (step.agentId.includes("research")) artifactType = "RESEARCH_REPORT";
                else if (step.agentId.includes("analytics")) artifactType = "ANALYTICS_REPORT";
                else if (step.agentId.includes("strategy")) artifactType = "STRATEGY_PLAN";
                else if (step.agentId.includes("marketing")) artifactType = "MARKETING_PLAN";
                else if (step.agentId.includes("copy")) artifactType = "COPY_PACKAGE";
                else if (step.agentId.includes("funnel") || step.agentId.includes("sales")) artifactType = "SALES_ANALYSIS";
                else if (step.agentId.includes("web-coding")) artifactType = "CODE_ARTIFACT";
                else if (step.agentId.includes("automation")) artifactType = "AUTOMATION_WORKFLOW";
                else if (step.agentId.includes("support")) artifactType = "SUPPORT_CASE";
                else if (step.agentId.includes("operations")) artifactType = "OPERATIONS_PLAN";

                const artifact = this.workforceRegistry.createArtifact({
                  artifactType,
                  title: `${step.agentName}: ${step.task.slice(0, 60)}`,
                  description: step.summary || step.task,
                  sourceWorker: step.agentId,
                  sourceTask: step.id,
                  organizationId: input.organizationId,
                  content: typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2),
                  structuredData: typeof result.data === "object" ? (result.data as Record<string, unknown>) : {},
                  evidence: result.toolsUsed || [],
                  assumptions: [],
                  verificationChecks: ["technical_passed", "business_passed"],
                });

                this.workforceRegistry.verifyArtifact(artifact.artifactId, input.organizationId, {
                  verified: true,
                  verifier: "OutcomeVerificationService",
                  checks: ["technical_passed", "business_passed"],
                  technicalPassed: true,
                  businessPassed: true,
                });

                if (step.output && typeof step.output === "object") {
                  (step.output as any).artifactId = artifact.artifactId;
                }
              } catch {
                // Non-blocking artifact creation
              }

              // Phase 4.0.1: Emit Governed Learning Signal
              this.workforceRegistry.emitLearningSignal({
                signalType: "TASK_SUCCEEDED",
                organizationId: input.organizationId,
                executionId: plan.executionId,
                taskId: step.id,
                workerId: step.agentId,
                payload: { summary: step.summary, toolsUsed: result.toolsUsed },
              });

              return { success: true, step, result };
            } else {
              // Diagnosed failure — Trigger automated worker self-repair turn if not already attempted
              step.error = verification.error || result.errors?.join(", ") || "Verification check failed";

              // Phase 4.0.1: Emit verification failure signal
              this.workforceRegistry.emitLearningSignal({
                signalType: "VERIFICATION_FAILED",
                organizationId: input.organizationId,
                executionId: plan.executionId,
                taskId: step.id,
                workerId: step.agentId,
                payload: { error: step.error, retryAttempt: step.retryCount + 1 },
              });
              if (!(step as any).selfRepairAttempted) {
                (step as any).selfRepairAttempted = true;
                this.workforceRegistry.logActivity({
                  organizationId: input.organizationId,
                  executionId: plan.executionId,
                  taskId: step.id,
                  workerId: step.agentId,
                  eventType: "VERIFICATION_FAILED",
                  status: "SELF_REPAIR_TRIGGERED",
                  metadata: {
                    deficiency: step.error,
                    retryAttempt: step.retryCount + 1,
                  },
                });
                step.input = {
                  ...step.input,
                  selfRepairDirective: `Verification check failed: "${step.error}". Address this deficiency immediately and regenerate verified deliverable.`,
                  retryReason: step.error,
                };
              } else {
                step.input = { ...step.input, retryReason: step.error };
              }
            }
          } catch (err: any) {
            lastResult = {
              agentId: step.agentId,
              success: false,
              summary: err?.message || "Transient execution error",
              data: {},
              recommendations: [],
              actionsTaken: [],
              toolsUsed: [],
              needsMoreWork: false,
              confidence: 0,
              errors: [err?.message || "Execution error"],
            };
            step.error = err?.message || "Execution error";
          }

          step.retryCount++;
          state.totalRetries++;

          if (step.retryCount <= maxRetries) {
            step.status = "RETRYING";
            await new Promise((resolve) => setTimeout(resolve, 50 * (step.retryCount || 1)));
          }
        }

        // All retries exhausted
        step.status = "FAILED";
        step.completedAt = Date.now();
        step.error = lastResult?.errors?.join(", ") || step.error || "Execution failed after retries";

        this.workforceRegistry.releaseWorker({
          workerId: step.agentId,
          taskId: step.id,
          success: false,
          durationMs: Date.now() - step.startedAt,
        });

        return { success: false, step, result: lastResult! };
      });

      const batchResults = await Promise.all(stepExecutionPromises);

      for (const res of batchResults) {
        state.agentResults.push(res.result);

        if (!res.success) {
          // Phase 4: Worker Reassignment — Attempt alternative worker before aborting (strictly bounded to 1 attempt per step)
          const stepAny = res.step as any;
          if (!stepAny.reassigned) {
            stepAny.reassigned = true;
            const altWorker = this.findAlternativeWorker(res.step, input.organizationId);
            if (altWorker && altWorker.id !== res.step.agentId) {
              const previousWorkerId = res.step.agentId;
              res.step.agentId = altWorker.id;
              res.step.agentName = altWorker.name;
              res.step.retryCount = 0;
              res.step.status = "PENDING";
              res.step.error = undefined;
              this.workforceRegistry.logActivity({
                organizationId: input.organizationId,
                executionId: plan.executionId,
                taskId: res.step.id,
                workerId: altWorker.id,
                eventType: "WORKER_REASSIGNED",
                status: "REASSIGNED",
                metadata: { previousWorkerId, reason: res.step.error },
              });
              state.agentResults.pop();
              return await this.executePlanInternal(state);
            }
          }

          // Bounded Replanning: Allow up to 2 replanning attempts
          if (state.replanCount < 2) {
            state.replanCount++;
            plan.status = "REPLANNING";
            const replanned = await this.replanExecution(
              plan,
              res.step,
              res.step.error || "Step failed",
              input,
              accumulatedContext
            );
            if (replanned) {
              // Reset failed step for re-execution under adapted plan
              res.step.status = "PENDING";
              res.step.retryCount = 0;
              res.step.error = undefined;
              state.agentResults.pop(); // Remove failed attempt result
              return await this.executePlanInternal(state);
            }
          }

          plan.status = "FAILED";
          const failMsg = `ELMO encountered an issue executing ${res.step.agentName}: ${res.step.error}`;
          const canonical = this.logExecutionHistory(
            plan,
            input,
            startTime,
            state.totalRetries,
            state.agentResults,
            state.previewPayload,
            failMsg,
            "FAILED",
            state.replanCount
          );
          return {
            isDirectAnswer: false,
            response: failMsg,
            plan,
            agentResults: state.agentResults,
            visualState: "ERROR",
            canonicalExecution: canonical,
          };
        }

        completedStepIds.add(res.step.id);
        Object.assign(accumulatedContext, res.result.data);

        if (res.result.data.preview) {
          state.previewPayload = res.result.data.preview;
        }
      }
    }

    plan.status = "COMPLETED";
    plan.completedAt = Date.now();

    // 5. Synthesize unified executive response
    const finalResponse = this.synthesizePlanResponse(plan, state.agentResults);

    // 6. Record Activity Timeline
    try {
      await this.activityService.recordActivity({
        organizationId: input.organizationId,
        userId: input.userId,
        type: "execution_completed",
        actorName: "ELMO Central Brain",
        actorType: "AI",
        description: `Completed execution for "${plan.objective}" with ${state.agentResults.length} agents.`,
        metadata: {
          executionId: plan.executionId,
          agentsInvolved: plan.steps.map((s) => s.agentId),
          durationMs: Date.now() - startTime,
        },
      });
    } catch {
      // Non-blocking
    }

    // 7. Store durable strategic milestone & learned preferences in Company Memory
    // Prevent False Memory Milestones:
    const executedTools = Array.from(new Set(state.agentResults.flatMap((r) => r.toolsUsed || [])));
    const hasOperationalExecution =
      executedTools.length > 0 &&
      executedTools.some((t) => t !== "query_memory" && t !== "store_memory");
    const businessOutcomeStatus: BusinessOutcomeStatus = hasOperationalExecution
      ? "BUSINESS_OUTCOME_VERIFIED"
      : "BUSINESS_OUTCOME_PARTIAL";

    try {
      const memoryContent = hasOperationalExecution
        ? `AI Workflow for "${plan.objective}": Successfully orchestrated and verified with ${state.agentResults.length} specialized agents (${plan.steps.map((s) => s.agentName).join(", ")}). Executed tools: ${executedTools.join(", ")}.`
        : `Strategic Planning Roadmap for "${plan.objective}": Formulated multi-agent diagnostic and improvement roadmap with ${state.agentResults.length} specialized agents (${plan.steps.map((s) => s.agentName).join(", ")}).`;

      await this.memoryService.storeMemory({
        organizationId: input.organizationId,
        scope: "organization",
        content: memoryContent,
        importanceScore: hasOperationalExecution ? 0.85 : 0.70,
        metadata: {
          category: "decisions",
          source: "orchestrator",
          tags: ["strategy", hasOperationalExecution ? "workflow-completion" : "strategic-planning", ...state.agentResults.map((r) => r.agentId)],
        },
      });
    } catch {
      // Non-blocking
    }

    // 8. Log Canonical Execution Object in ExecutionHistoryService
    const canonical = this.logExecutionHistory(
      plan,
      input,
      startTime,
      state.totalRetries,
      state.agentResults,
      state.previewPayload,
      finalResponse,
      "COMPLETED"
    );

    // Phase 4.0.1: Emit Workflow Completion Learning Signals
    try {
      this.workforceRegistry.emitLearningSignal({
        signalType: "TASK_SUCCEEDED",
        organizationId: input.organizationId,
        executionId: plan.executionId,
        taskId: plan.id,
        payload: {
          objective: plan.objective,
          stepsCount: plan.steps.length,
          businessOutcomeStatus,
        },
      });

      if (hasOperationalExecution) {
        this.workforceRegistry.emitLearningSignal({
          signalType: "SUCCESSFUL_WORKFLOW_PATTERN",
          organizationId: input.organizationId,
          executionId: plan.executionId,
          taskId: plan.id,
          payload: {
            objective: plan.objective,
            agents: plan.steps.map((s) => s.agentId),
            tools: executedTools,
          },
        });
      }
    } catch {
      // Non-blocking
    }

    this.activeExecutions.delete(plan.executionId);

    return {
      isDirectAnswer: false,
      response: finalResponse,
      plan,
      agentResults: state.agentResults,
      previewPayload: state.previewPayload,
      visualState: "SUCCESS",
      canonicalExecution: canonical,
      businessOutcomeStatus,
    };
  }

  /**
   * Resumes or modifies an execution paused at WAITING_FOR_APPROVAL.
   */
  public async handleApprovalDecision(
    executionId: string,
    decision: "approve" | "modify" | "cancel",
    options: { userId: string; organizationId: string; modificationNotes?: string }
  ): Promise<OrchestrationResult> {
    const active = this.activeExecutions.get(executionId);
    if (!active) {
      throw new Error(`Active execution for ${executionId} not found or already completed.`);
    }

    const { plan, input, startTime, totalRetries, agentResults, previewPayload } = active;
    const pending = plan.approvalRequirements;

    if (decision === "cancel") {
      if (pending?.approvalId) {
        await this.approvalService.cancel(pending.approvalId, options.userId, options.organizationId, options.modificationNotes);
      }
      plan.status = "CANCELLED";
      const cancelMsg = `Execution for "${plan.objective}" was cancelled by user.`;
      this.logExecutionHistory(plan, input, startTime, totalRetries, agentResults, previewPayload, cancelMsg, "CANCELLED");

      // Phase 4.0.1: Emit human rejection learning signal
      this.workforceRegistry.emitLearningSignal({
        signalType: "HUMAN_REJECTION",
        organizationId: options.organizationId,
        executionId,
        taskId: pending?.stepId,
        payload: { actionTitle: pending?.actionTitle, reason: options.modificationNotes },
      });

      this.activeExecutions.delete(executionId);
      return {
        isDirectAnswer: false,
        response: cancelMsg,
        plan,
        agentResults,
        visualState: "ERROR",
      };
    }

    if (decision === "modify") {
      if (pending?.approvalId) {
        await this.approvalService.modify(
          pending.approvalId,
          options.userId,
          options.organizationId,
          options.modificationNotes || "User requested plan modification"
        );
      }
      const targetStep = plan.steps.find((s) => s.id === pending?.stepId);
      if (targetStep) {
        targetStep.input = {
          ...targetStep.input,
          modificationNotes: options.modificationNotes,
          notes: options.modificationNotes,
        };
        targetStep.approvalRequired = false;
        targetStep.status = "PENDING";
      }
      plan.approvalRequirements = undefined;
      plan.status = "REPLANNING";
      active.replanCount++;

      // Phase 4.0.1: Emit human correction learning signal with memory persistence
      this.workforceRegistry.emitLearningSignal({
        signalType: "HUMAN_CORRECTION",
        organizationId: options.organizationId,
        executionId,
        taskId: pending?.stepId,
        payload: { actionTitle: pending?.actionTitle, modificationNotes: options.modificationNotes },
        persistToMemory: true,
        governedCategory: "correction",
        memoryTitle: `Human Correction: ${pending?.actionTitle}`,
        memoryContent: `Correction requested for ${pending?.actionTitle}: ${options.modificationNotes}`,
      });

      return await this.executePlanInternal(active);
    }

    if (decision === "approve") {
      if (pending?.approvalId) {
        await this.approvalService.approve(pending.approvalId, options.userId, options.organizationId);
      }
      const targetStep = plan.steps.find((s) => s.id === pending?.stepId);
      if (targetStep) {
        targetStep.approvalRequired = false;
        targetStep.status = "PENDING";
      }
      plan.approvalRequirements = undefined;
      plan.status = "EXECUTING";

      // Phase 4.0.1: Emit human approval learning signal
      this.workforceRegistry.emitLearningSignal({
        signalType: "HUMAN_APPROVAL",
        organizationId: options.organizationId,
        executionId,
        taskId: pending?.stepId,
        payload: { actionTitle: pending?.actionTitle },
      });

      return await this.executePlanInternal(active);
    }

    throw new Error(`Unsupported approval decision: ${decision}`);
  }

  /**
   * Verifies critical structured outputs of each step distinguishing technical from business success.
   */
  private verifyStepOutput(
    step: ExecutionStep,
    result: AgentResult,
    context: Record<string, unknown>
  ): { valid: boolean; error?: string } {
    if (!result.success) {
      return { valid: false, error: result.errors?.join(", ") || "Technical step execution failed" };
    }

    const topic = ((context.topic as string) || "").toLowerCase();

    if (step.agentId === "copy-agent") {
      const hasContent = Boolean(result.data.headlines || result.data.primaryHeadline || result.summary);
      if (!hasContent) {
        return { valid: false, error: "Copy Agent produced no headlines or copy content" };
      }
      if (topic.includes("restaurant") || topic.includes("cafe")) {
        const text = JSON.stringify(result.data).toLowerCase();
        if (text.includes("property agent") || text.includes("real estate investment")) {
          return { valid: false, error: "Domain contamination: Real estate copy detected in restaurant copy output" };
        }
      }
      return { valid: true };
    }

    if (step.agentId === "web-coding-agent") {
      const hasBuild = Boolean(result.data.preview || result.data.page || result.summary);
      if (!hasBuild) {
        return { valid: false, error: "Web/Coding Agent produced no page, preview, or summary" };
      }
      if (result.data.page) {
        const page = result.data.page as any;
        if (page.organization_id && page.organization_id !== context.organizationId) {
          return { valid: false, error: "Security violation: Page organization_id does not match execution tenant" };
        }
      }
      if (topic.includes("restaurant") || topic.includes("cafe")) {
        const text = JSON.stringify(result.data).toLowerCase();
        if (text.includes("property agent") || text.includes("condominium")) {
          return { valid: false, error: "Domain contamination: Property elements detected in restaurant website" };
        }
      }
      return { valid: true };
    }

    if (step.agentId === "research-agent") {
      const hasResearch = Boolean(result.data.painPoints || result.data.competitorGaps || result.summary);
      if (!hasResearch) {
        return { valid: false, error: "Research Agent returned empty market intelligence" };
      }
      return { valid: true };
    }

    if (step.agentId === "marketing-agent") {
      const hasMarketing = Boolean(result.data.positioning || result.data.valueProposition || result.summary);
      if (!hasMarketing) {
        return { valid: false, error: "Marketing Agent returned empty positioning strategy" };
      }
      return { valid: true };
    }

    return { valid: true };
  }

  /**
   * Adapts execution plan when a step encounters an error.
   */
  private async replanExecution(
    plan: ExecutionPlan,
    failedStep: ExecutionStep,
    error: string,
    input: OrchestratorInput,
    context: Record<string, unknown>
  ): Promise<boolean> {
    failedStep.input = {
      ...failedStep.input,
      retryGuidance: `Previous attempt encountered: ${error}. Simplify instructions and adhere strictly to output schema.`,
    };
    return true;
  }

  /**
   * Persists record to ExecutionHistoryService and generates CanonicalExecutionObject.
   */
  private logExecutionHistory(
    plan: ExecutionPlan,
    input: OrchestratorInput,
    startTime: number,
    retryCount: number,
    agentResults: AgentResult[],
    previewPayload: unknown,
    summary: string,
    status: PlanStatus,
    replanCount: number = 0
  ): CanonicalExecutionObject {
    const canonical: CanonicalExecutionObject = {
      id: plan.id,
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
      goal: input.message,
      objective: plan.objective,
      context: input.companyBrainContext || {},
      plan,
      steps: plan.steps,
      selectedAgents: plan.steps.map((s) => s.agentId),
      selectedTools: plan.selectedTools || Array.from(new Set(agentResults.flatMap((r) => r.toolsUsed || []))),
      plannedTools: plan.selectedTools || [],
      executedTools: Array.from(new Set(agentResults.flatMap((r) => r.toolsUsed || []))),
      status: status as any,
      businessOutcomeStatus:
        status === "WAITING_FOR_INPUT"
          ? "WAITING_FOR_INPUT"
          : status === "WAITING_FOR_APPROVAL" || (status as string) === "AWAITING_APPROVAL"
          ? "WAITING_FOR_APPROVAL"
          : status === "FAILED"
          ? "FAILED"
          : status === "COMPLETED" && Array.from(new Set(agentResults.flatMap((r) => r.toolsUsed || []))).some((t) => t !== "query_memory" && t !== "store_memory")
          ? "BUSINESS_OUTCOME_VERIFIED"
          : "BUSINESS_OUTCOME_PARTIAL",
      currentStep: plan.steps.filter((s) => s.status === "COMPLETED").length,
      knowledgeContext: plan.knowledgeContext,
      retrievalProvenance: plan.knowledgeContext?.provenance,
      approvalState: plan.approvalRequirements
        ? {
            required: true,
            status:
              status === "WAITING_FOR_APPROVAL" || (status as string) === "AWAITING_APPROVAL"
                ? "PENDING"
                : status === "CANCELLED"
                ? "REJECTED"
                : "APPROVED",
            details: plan.approvalRequirements,
          }
        : undefined,
      verificationState: {
        status: status === "COMPLETED" ? "PASSED" : status === "FAILED" ? "FAILED" : "PENDING",
      },
      retryCount,
      replanCount,
      result: { summary },
      createdAt: startTime,
      updatedAt: Date.now(),
      completedAt:
        status === "COMPLETED" || status === "FAILED" || status === "CANCELLED" ? Date.now() : undefined,
    };

    try {
      this.historyService.recordExecution({
        executionId: plan.executionId,
        organizationId: input.organizationId,
        userId: input.userId,
        goal: input.message,
        objective: plan.objective,
        status,
        stepsCount: plan.steps.length,
        completedStepsCount: plan.steps.filter((s) => s.status === "COMPLETED").length,
        agentsInvolved: plan.steps.map((s) => s.agentId),
        toolsUsed: Array.from(new Set(agentResults.flatMap((r) => r.toolsUsed || []))),
        retryCount,
        startedAt: startTime,
        completedAt: Date.now(),
        summary,
        previewUrl: previewPayload ? "/preview" : undefined,
        approvalStatus: plan.approvalRequirements ? "REQUESTED" : "NONE",
      });
    } catch {
      // Non-blocking
    }

    return canonical;
  }

  /**
   * Synthesizes step results into a polished, unified executive response.
   */
  private synthesizePlanResponse(plan: ExecutionPlan, results: AgentResult[]): string {
    if (results.length === 1) {
      let singleRes = results[0].summary;
      if (plan.knowledgeContext && plan.knowledgeContext.provenance && plan.knowledgeContext.provenance.length > 0) {
        singleRes += `\n\n📚 **Source Provenance:**\n`;
        plan.knowledgeContext.provenance.forEach((p: any) => {
          const snippet = (p.contentSnippet || "").replace(/\s+/g, " ").trim().slice(0, 140);
          const ver = p.version ?? p.documentVersion ?? 1;
          const chunkNum = (p.chunkIndex ?? 0) + 1;
          singleRes += `- **${p.documentTitle}** (v${ver}, Chunk ${chunkNum}) — "${snippet}..."\n`;
        });
      }
      return singleRes.trim();
    }

    let res = `I have completed the end-to-end execution for **"${plan.objective}"**:\n\n`;

    results.forEach((r) => {
      const icon =
        r.agentId === "web-coding-agent"
          ? "🎨"
          : r.agentId === "copy-agent"
          ? "✍️"
          : r.agentId === "marketing-agent"
          ? "🎯"
          : r.agentId === "research-agent"
          ? "🔍"
          : "⚡";
      res += `${icon} **${this.formatAgentName(r.agentId)}:** ${r.summary}\n`;
    });

    const webResult = results.find((r) => r.agentId === "web-coding-agent");
    if (webResult?.data.preview) {
      res += `\n✨ **Your interactive landing page is live and ready to preview!** You can toggle between Desktop, Tablet, and Mobile views on your dashboard.`;
    }

    if (plan.knowledgeContext && plan.knowledgeContext.provenance && plan.knowledgeContext.provenance.length > 0) {
      res += `\n\n📚 **Source Provenance:**\n`;
      plan.knowledgeContext.provenance.forEach((p: any) => {
        const snippet = (p.contentSnippet || "").replace(/\s+/g, " ").trim().slice(0, 140);
        const ver = p.version ?? p.documentVersion ?? 1;
        const chunkNum = (p.chunkIndex ?? 0) + 1;
        res += `- **${p.documentTitle}** (v${ver}, Chunk ${chunkNum}) — "${snippet}..."\n`;
      });
    }

    return res.trim();
  }

  private formatAgentName(agentId: string): string {
    const map: Record<string, string> = {
      "marketing-agent": "Marketing Strategy",
      "copy-agent": "Conversion Copy",
      "web-coding-agent": "Web & Page Architecture",
      "funnel-agent": "Funnel Flow",
      "analytics-agent": "Analytics Audit",
      "research-agent": "Market Research",
    };
    return map[agentId] || agentId;
  }

  /**
   * Phase 4: Find alternative worker when a worker repeatedly fails or cannot proceed.
   * Matches capabilities or skills with available capacity in the workforce.
   */
  private findAlternativeWorker(failedStep: ExecutionStep, organizationId: string): WorkerDefinition | undefined {
    const workers: WorkerDefinition[] = this.registry.getWorkers({ organizationId });
    const failedAgentId = failedStep.agentId;
    const resolvedFailedId = this.registry.resolveWorkerAlias(failedAgentId);

    // Filter available active workers other than the failed one
    const candidates = workers.filter(
      (w: WorkerDefinition) => w.enabled && w.status !== "DISABLED" && w.id !== failedAgentId && w.id !== resolvedFailedId
    );

    if (candidates.length === 0) return undefined;

    // Check capability / skill overlap
    const stepSkills = (failedStep.skills || []).map((s: string) => s.toLowerCase());
    const stepTools = (failedStep.tools || []).map((t: string) => t.toLowerCase());

    const scoredCandidates = candidates.map((worker: WorkerDefinition) => {
      let score = 0;
      const workerSkills = (worker.skills || []).map((s: string) => s.toLowerCase());
      const workerTools = (worker.allowedTools || []).map((t: string) => t.toLowerCase());
      const workerCaps = (worker.capabilities || []).map((c: string) => c.toLowerCase());

      // Overlap on skills
      for (const skill of stepSkills) {
        if (workerSkills.some((ws: string) => ws.includes(skill) || skill.includes(ws))) score += 3;
        if (workerCaps.some((wc: string) => wc.includes(skill) || skill.includes(wc))) score += 2;
      }

      // Overlap on tools
      for (const tool of stepTools) {
        if (workerTools.includes(tool)) score += 4;
      }

      // Role compatibility fallbacks:
      if (
        (failedAgentId.includes("marketing") || failedAgentId.includes("copy")) &&
        (worker.id.includes("marketing") || worker.id.includes("copy"))
      ) {
        score += 5;
      }
      if (
        (failedAgentId.includes("analytics") || failedAgentId.includes("research")) &&
        (worker.id.includes("analytics") || worker.id.includes("research"))
      ) {
        score += 5;
      }
      if (
        (failedAgentId.includes("operations") || failedAgentId.includes("analytics")) &&
        (worker.id.includes("operations") || worker.id.includes("analytics"))
      ) {
        score += 3;
      }
      if (
        (failedAgentId.includes("sales") || failedAgentId.includes("marketing")) &&
        (worker.id.includes("sales") || worker.id.includes("marketing"))
      ) {
        score += 3;
      }

      // Workload penalty if worker is at or above capacity
      if (worker.workload >= worker.capacity) {
        score = -1;
      }

      return { worker, score };
    });

    const eligible = scoredCandidates.filter((c: { worker: WorkerDefinition; score: number }) => c.score > 0);
    eligible.sort((a: { worker: WorkerDefinition; score: number }, b: { worker: WorkerDefinition; score: number }) => b.score - a.score);

    return eligible[0]?.worker;
  }
}


