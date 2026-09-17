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
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { AgentExecutorService } from "./agent-executor.service";
import { ExecutionHistoryService } from "./execution-history.service";
import { ElmoIntentService, IntentAnalysisResult } from "@/services/elmo-intent.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { ApprovalService } from "@/services/approval.service";
import { ActivityService } from "@/services/activity.service";
import { MemoryEntry } from "@/types/future/memory.types";

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
}

export interface OrchestrationResult {
  isDirectAnswer: boolean;
  response: string;
  plan?: ExecutionPlan;
  agentResults: AgentResult[];
  previewPayload?: unknown;
  pendingApproval?: PendingApprovalDetails;
  visualState: "THINKING" | "EXECUTING" | "SUCCESS" | "ERROR" | "AWAITING_APPROVAL";
  canonicalExecution?: CanonicalExecutionObject;
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

    // 3. Plan Generation (Single Agent vs Multi-Agent)
    const plan = this.createExecutionPlan(input, intent);

    if (plan.steps.length === 0) {
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
        lower.includes("kempen jana leads")) &&
      !isCopyOnly &&
      !isAnalyticsOnly;

    const isCompetitorLandingPage =
      lower.includes("competitor") &&
      (lower.includes("landing page") || lower.includes("page") || lower.includes("website"));

    // Formulate Steps:
    if (isPublishOrDeploy) {
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
        input: { message: raw, topic },
        maxRetries: 2,
      });
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
          input: { targetAudience, topic: `${topic} competitor research` },
          maxRetries: 2,
        },
        {
          id: `step-2`,
          stepNumber: 2,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: `Formulate positioning exploiting competitor weaknesses for ${targetAudience}`,
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { targetAudience, businessType: topic, topic },
          maxRetries: 2,
        },
        {
          id: `step-3`,
          stepNumber: 3,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: `Draft conversion copy emphasizing differentiation for ${targetAudience}`,
          dependencies: ["step-2"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { targetAudience, topic },
          maxRetries: 2,
        },
        {
          id: `step-4`,
          stepNumber: 4,
          agentId: "web-coding-agent",
          agentName: "Web/Coding Agent",
          task: `Build and validate the landing page highlighting competitor gaps for ${targetAudience}`,
          dependencies: ["step-3"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
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
          input: { message: `Connect conversion flow for ${targetAudience}` },
          maxRetries: 2,
        }
      );
    } else {
      // Default to Funnel Agent delegation for operational SaaS actions
      const isHighRisk =
        lower.includes("delete all") ||
        lower.includes("production database") ||
        lower.includes("mass email") ||
        lower.includes("drop table");

      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "funnel-agent",
        agentName: "Funnel Agent",
        task: raw,
        dependencies: [],
        status: "PENDING",
        riskLevel: isHighRisk ? "HIGH" : "LOW",
        approvalRequired: isHighRisk,
        input: { message: raw, topic },
        maxRetries: 2,
      });
    }

    return {
      id: planId,
      executionId: `exec-${Date.now()}`,
      organizationId: input.organizationId,
      userId: input.userId,
      objective: raw,
      steps,
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

    const accumulatedContext: Record<string, unknown> = {
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
      companyBrainMemories: existingMemories.map((m) => m.content),
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
      const highRiskStep = readySteps.find((s) => s.approvalRequired || s.riskLevel === "HIGH");
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
              return { success: true, step, result };
            } else {
              // Diagnosed failure
              step.error = verification.error || result.errors?.join(", ") || "Verification check failed";
              step.input = { ...step.input, retryReason: step.error };
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
        return { success: false, step, result: lastResult! };
      });

      const batchResults = await Promise.all(stepExecutionPromises);

      for (const res of batchResults) {
        state.agentResults.push(res.result);

        if (!res.success) {
          plan.status = "FAILED";
          const failMsg = `ELMO encountered an issue executing ${res.step.agentName}: ${res.step.error}`;
          this.logExecutionHistory(plan, input, startTime, state.totalRetries, state.agentResults, state.previewPayload, failMsg, "FAILED");
          return {
            isDirectAnswer: false,
            response: failMsg,
            plan,
            agentResults: state.agentResults,
            visualState: "ERROR",
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
    try {
      await this.memoryService.storeMemory({
        organizationId: input.organizationId,
        scope: "organization",
        content: `AI Workflow for "${plan.objective}": Successfully orchestrated with ${state.agentResults.length} specialized agents (${plan.steps.map((s) => s.agentName).join(", ")}).`,
        importanceScore: 0.85,
        metadata: {
          category: "decisions",
          source: "orchestrator",
          tags: ["strategy", "workflow-completion", ...state.agentResults.map((r) => r.agentId)],
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

    this.activeExecutions.delete(plan.executionId);

    return {
      isDirectAnswer: false,
      response: finalResponse,
      plan,
      agentResults: state.agentResults,
      previewPayload: state.previewPayload,
      visualState: "SUCCESS",
      canonicalExecution: canonical,
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
    status: PlanStatus
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
      selectedTools: Array.from(new Set(agentResults.flatMap((r) => r.toolsUsed || []))),
      status: status as any,
      currentStep: plan.steps.filter((s) => s.status === "COMPLETED").length,
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
      replanCount: 0,
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
      return results[0].summary;
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
}
