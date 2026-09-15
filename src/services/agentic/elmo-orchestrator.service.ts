/**
 * ELMO Phase 3 — Central Orchestrator Service (ElmoOrchestratorService)
 *
 * Coordinates multi-agent planning, dependency-driven execution (supporting both parallel
 * and sequential steps), bounded retries, loop protection, Company Brain memory integration,
 * audit execution logging, and unified response synthesis directly underneath ELMO Central Brain.
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
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { AgentExecutorService } from "./agent-executor.service";
import { ExecutionHistoryService } from "./execution-history.service";
import { ElmoIntentService, IntentAnalysisResult } from "@/services/elmo-intent.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
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
}

export class ElmoOrchestratorService {
  private static instance: ElmoOrchestratorService;
  private registry: AgentRegistryService;
  private executor: AgentExecutorService;
  private intentService: ElmoIntentService;
  private memoryService: ElmoMemoryService;
  private historyService: ExecutionHistoryService;

  // Stored plans: planId -> ExecutionPlan
  private activePlans: Map<string, ExecutionPlan> = new Map();

  private constructor() {
    this.registry = AgentRegistryService.getInstance();
    this.executor = AgentExecutorService.getInstance();
    this.intentService = ElmoIntentService.getInstance();
    this.memoryService = ElmoMemoryService.getInstance();
    this.historyService = ExecutionHistoryService.getInstance();
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
      !lower.includes("funnel") &&
      !lower.includes("campaign");

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

    // If no agents were required, allow direct ELMO answer
    if (plan.steps.length === 0) {
      return {
        isDirectAnswer: true,
        response: "",
        agentResults: [],
        visualState: "SUCCESS",
      };
    }

    this.activePlans.set(plan.id, plan);

    // 4. Controlled Execution with Loop Protection, Parallel Support, Retries & Approval Gates
    return await this.executePlan(plan, input);
  }

  /**
   * Plans ordered and parallel-capable steps dynamically based on the user's intent and goal.
   */
  public createExecutionPlan(input: OrchestratorInput, intent: IntentAnalysisResult): ExecutionPlan {
    const raw = input.message.trim();
    const lower = raw.toLowerCase();
    const planId = `plan-${Date.now()}`;
    const steps: ExecutionStep[] = [];

    // Check for explicit natural language edits to landing page / website
    const isWebEdit =
      lower.includes("make the hero") ||
      lower.includes("change the cta") ||
      lower.includes("make this mobile") ||
      lower.includes("move testimonials") ||
      lower.includes("shorten the headline") ||
      lower.includes("add a lead form") ||
      lower.includes("more premium");

    // Check for full landing page or website creation
    const isFullWebCreation =
      /\b(create|build|make|generate|design|launch|bina|buat)\b.*\b(landing page|website|webpage|sales page|funnel page)\b/i.test(lower) ||
      (lower.includes("landing page") && (lower.includes("create") || lower.includes("build") || lower.includes("make") || lower.includes("bina") || lower.includes("buat"))) ||
      lower.includes("build me a landing page") ||
      lower.includes("create me a landing page") ||
      lower.includes("create a landing page") ||
      lower.includes("build a website") ||
      lower.includes("create a website") ||
      lower.includes("bina landing page") ||
      lower.includes("buat landing page");

    // Check for headline / copy specific request
    const isCopyOnly =
      (lower.includes("headline") || lower.includes("copy") || lower.includes("tajuk")) &&
      !isFullWebCreation &&
      !isWebEdit &&
      !lower.includes("campaign") &&
      !lower.includes("lead generation");

    // Check for analytics request
    const isAnalyticsOnly =
      lower.includes("analytics") ||
      lower.includes("metric") ||
      lower.includes("conversion rate") ||
      lower.includes("drop-off");

    // Check for comprehensive lead gen / campaign outcome directive (Section 37 acceptance requirement)
    const isLeadGenCampaign =
      (lower.includes("launch a lead generation campaign") ||
        lower.includes("create a campaign to get more leads") ||
        lower.includes("lead generation campaign") ||
        lower.includes("campaign for my business") ||
        lower.includes("kempen jana leads")) &&
      !isCopyOnly &&
      !isAnalyticsOnly;

    // Check for competitor research + landing page
    const isCompetitorLandingPage =
      lower.includes("competitor") &&
      (lower.includes("landing page") || lower.includes("page") || lower.includes("website"));

    // Extract target audience if mentioned
    let targetAudience = "Property Agents";
    if (lower.includes("property agent") || lower.includes("real estate") || lower.includes("hartanah")) {
      targetAudience = "Property Agents";
    } else if (lower.includes("consult") || lower.includes("coach")) {
      targetAudience = "Consultants & Coaches";
    } else if (lower.includes("e-commerce") || lower.includes("ecommerce")) {
      targetAudience = "E-commerce Brands";
    }

    if (isWebEdit) {
      // Single-Agent Web/Coding Agent Edit
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
        input: { message: raw },
        maxRetries: 2,
      });
    } else if (isCopyOnly) {
      // Single-Agent Copy Generation
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "copy-agent",
        agentName: "Copy Agent",
        task: `Generate headlines and conversion copy: ${raw}`,
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        input: { topic: raw, targetAudience },
        maxRetries: 2,
      });
    } else if (isAnalyticsOnly) {
      // Single-Agent Analytics Audit
      steps.push({
        id: `step-1`,
        stepNumber: 1,
        agentId: "analytics-agent",
        agentName: "Analytics Agent",
        task: "Analyze conversion performance and recommendations",
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        input: { message: raw },
        maxRetries: 2,
      });
    } else if (isLeadGenCampaign) {
      // AI-Native End-to-End Campaign Goal (Section 37 Acceptance Test):
      // Step 1: Research Agent (Audience pain points & market insights)
      // Step 2: Marketing Agent (Positioning & offer strategy) - Runs concurrently/in parallel with Step 1
      // Step 3: Copy Agent (Craft conversion copy & headlines, depends on Step 1 and Step 2)
      // Step 4: Web/Coding Agent (Build & validate responsive landing page, depends on Step 3)
      // Step 5: Funnel Agent (Connect lead qualification and capture flow, depends on Step 4)
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
          input: { targetAudience, topic: "Lead Generation Campaign" },
          maxRetries: 2,
        },
        {
          id: `step-2`,
          stepNumber: 2,
          agentId: "marketing-agent",
          agentName: "Marketing Agent",
          task: `Define positioning, value proposition, and campaign offer strategy for ${targetAudience}`,
          dependencies: [], // Independent: can run in parallel with step-1
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { targetAudience, businessType: "AI Business" },
          maxRetries: 2,
        },
        {
          id: `step-3`,
          stepNumber: 3,
          agentId: "copy-agent",
          agentName: "Copy Agent",
          task: `Draft high-converting headlines, benefits, and call-to-actions tailored for ${targetAudience}`,
          dependencies: ["step-1", "step-2"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { targetAudience },
          maxRetries: 2,
        },
        {
          id: `step-4`,
          stepNumber: 4,
          agentId: "web-coding-agent",
          agentName: "Web/Coding Agent",
          task: `Build, style, and validate the interactive campaign landing page for ${targetAudience}`,
          dependencies: ["step-3"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { targetAudience, topic: "Lead Generation Campaign" },
          maxRetries: 2,
        },
        {
          id: `step-5`,
          stepNumber: 5,
          agentId: "funnel-agent",
          agentName: "Funnel Agent",
          task: `Establish lead capture, qualification, and automated conversion flow for ${targetAudience}`,
          dependencies: ["step-4"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { message: `Create lead generation funnel for ${targetAudience}` },
          maxRetries: 2,
        }
      );
    } else if (isCompetitorLandingPage) {
      // Competitor Research + Landing Page Workflow:
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
          input: { targetAudience, topic: "competitor research" },
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
          input: { targetAudience, businessType: "AI Business" },
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
          input: { targetAudience },
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
          input: { targetAudience, topic: "AI Business" },
          maxRetries: 2,
        }
      );
    } else if (isFullWebCreation) {
      // Multi-Agent Workflow: Marketing -> Copy -> Web/Coding -> Funnel
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
          input: { targetAudience, businessType: "AI Business" },
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
          input: { targetAudience },
          maxRetries: 2,
        },
        {
          id: `step-3`,
          stepNumber: 3,
          agentId: "web-coding-agent",
          agentName: "Web/Coding Agent",
          task: `Build, style, and validate the responsive landing page for ${targetAudience}`,
          dependencies: ["step-2"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { targetAudience, topic: "AI Business" },
          maxRetries: 2,
        },
        {
          id: `step-4`,
          stepNumber: 4,
          agentId: "funnel-agent",
          agentName: "Funnel Agent",
          task: `Connect landing page to lead qualification and conversion flow`,
          dependencies: ["step-3"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          input: { message: `Create lead generation funnel for ${targetAudience}` },
          maxRetries: 2,
        }
      );
    } else {
      // Default to Funnel Agent delegation for operational SaaS actions
      const isHighRisk =
        lower.includes("delete all") ||
        lower.includes("deploy live") ||
        lower.includes("production database") ||
        lower.includes("mass email");

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
        input: { message: raw },
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
   * Executes a plan dynamically supporting dependency resolution, parallel execution,
   * bounded retries, loop protection, Company Brain integration, and audit logging.
   */
  public async executePlan(plan: ExecutionPlan, input: OrchestratorInput): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const MAX_HOPS = 10;
    const MAX_EXECUTION_TIME_MS = 30000;
    let hops = 0;
    let totalRetries = 0;
    let previewPayload: unknown = null;
    const agentResults: AgentResult[] = [];

    plan.status = "IN_PROGRESS";

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
      // Non-blocking memory search
    }

    const accumulatedContext: Record<string, unknown> = {
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
      companyBrainMemories: existingMemories.map((m) => m.content),
      ...input.companyBrainContext,
    };

    const completedStepIds = new Set<string>();

    // 2. Dynamic Dependency & Parallel Execution Loop
    while (completedStepIds.size < plan.steps.length) {
      hops++;

      // Loop Protection: Hop Limit
      if (hops > MAX_HOPS) {
        plan.status = "FAILED";
        const timeoutRes = "ELMO Safety Guard: Execution halted because the task exceeded maximum allowed agent hops.";
        this.logExecutionHistory(plan, input, startTime, totalRetries, agentResults, previewPayload, timeoutRes, "FAILED");
        return {
          isDirectAnswer: false,
          response: timeoutRes,
          plan,
          agentResults,
          visualState: "ERROR",
        };
      }

      // Loop Protection: Execution Time Limit
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        plan.status = "FAILED";
        const timeoutRes = "ELMO Safety Guard: Execution halted because task exceeded maximum execution time.";
        this.logExecutionHistory(plan, input, startTime, totalRetries, agentResults, previewPayload, timeoutRes, "FAILED");
        return {
          isDirectAnswer: false,
          response: timeoutRes,
          plan,
          agentResults,
          visualState: "ERROR",
        };
      }

      // Find all steps whose dependencies are all satisfied and not yet completed
      const readySteps = plan.steps.filter((s) => {
        if (completedStepIds.has(s.id) || s.status === "COMPLETED") return false;
        return s.dependencies.every((depId) => completedStepIds.has(depId));
      });

      if (readySteps.length === 0) {
        // Deadlock or circular dependency
        plan.status = "FAILED";
        const deadlockRes = "ELMO Orchestrator: Dependency resolution failed. Unresolved task prerequisites detected.";
        this.logExecutionHistory(plan, input, startTime, totalRetries, agentResults, previewPayload, deadlockRes, "FAILED");
        return {
          isDirectAnswer: false,
          response: deadlockRes,
          plan,
          agentResults,
          visualState: "ERROR",
        };
      }

      // 3. High-Risk Approval Gate Check
      const highRiskStep = readySteps.find((s) => s.approvalRequired || s.riskLevel === "HIGH");
      if (highRiskStep) {
        plan.status = "AWAITING_APPROVAL";
        highRiskStep.status = "AWAITING_APPROVAL";
        const pendingDetails: PendingApprovalDetails = {
          stepId: highRiskStep.id,
          agentId: highRiskStep.agentId,
          actionTitle: highRiskStep.task,
          description: `This action is classified as HIGH RISK and requires your explicit approval before execution.`,
          riskLevel: highRiskStep.riskLevel,
          proposedChanges: highRiskStep.input,
          requestedAt: Date.now(),
        };
        plan.approvalRequirements = pendingDetails;

        const approvalResponse = `Approval required before proceeding with step "${highRiskStep.task}". Please review and confirm.`;
        this.logExecutionHistory(plan, input, startTime, totalRetries, agentResults, previewPayload, approvalResponse, "AWAITING_APPROVAL");

        return {
          isDirectAnswer: false,
          response: approvalResponse,
          plan,
          agentResults,
          pendingApproval: pendingDetails,
          visualState: "AWAITING_APPROVAL",
        };
      }

      // 4. Execute Ready Steps (Parallel execution where multiple steps are independent)
      const stepExecutionPromises = readySteps.map(async (step) => {
        step.status = "IN_PROGRESS";
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

            if (result.success && this.verifyStepOutput(step, result)) {
              step.status = "COMPLETED";
              step.completedAt = Date.now();
              step.output = result.data;
              step.summary = result.summary;
              return { success: true, step, result };
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
          }

          // Step failed: attempt bounded retry if retries remaining
          step.retryCount++;
          totalRetries++;

          if (step.retryCount <= maxRetries) {
            step.status = "RETRYING";
            // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, 50 * (step.retryCount || 1)));
          }
        }

        // All retries exhausted
        step.status = "FAILED";
        step.completedAt = Date.now();
        step.error = lastResult?.errors?.join(", ") || lastResult?.summary || "Execution failed after retries";
        return { success: false, step, result: lastResult! };
      });

      const batchResults = await Promise.all(stepExecutionPromises);

      // Check if any step failed fatally
      for (const res of batchResults) {
        agentResults.push(res.result);

        if (!res.success) {
          plan.status = "FAILED";
          const failMsg = `ELMO encountered an issue executing ${res.step.agentName}: ${res.step.error}`;
          this.logExecutionHistory(plan, input, startTime, totalRetries, agentResults, previewPayload, failMsg, "FAILED");
          return {
            isDirectAnswer: false,
            response: failMsg,
            plan,
            agentResults,
            visualState: "ERROR",
          };
        }

        // Merge successful output into shared accumulated context
        completedStepIds.add(res.step.id);
        Object.assign(accumulatedContext, res.result.data);

        if (res.result.data.preview) {
          previewPayload = res.result.data.preview;
        }
      }
    }

    plan.status = "COMPLETED";
    plan.completedAt = Date.now();

    // 5. Synthesize final unified executive response
    const finalResponse = this.synthesizePlanResponse(plan, agentResults);

    // 6. Store strategic milestone to Company Memory (non-blocking)
    if (agentResults.length >= 2) {
      try {
        await this.memoryService.storeMemory({
          organizationId: input.organizationId,
          scope: "organization",
          content: `AI Workflow for "${plan.objective}": Successfully orchestrated with ${agentResults.length} specialized agents.`,
          importanceScore: 0.8,
          metadata: {
            category: "business",
            source: "orchestrator",
            tags: ["strategy", "workflow-completion", ...agentResults.map((r) => r.agentId)],
          },
        });
      } catch {
        // Safe non-blocking memory update
      }
    }

    // 7. Audit log in ExecutionHistoryService
    this.logExecutionHistory(plan, input, startTime, totalRetries, agentResults, previewPayload, finalResponse, "COMPLETED");

    return {
      isDirectAnswer: false,
      response: finalResponse,
      plan,
      agentResults,
      previewPayload,
      visualState: "SUCCESS",
    };
  }

  /**
   * Verifies critical structured outputs of each step.
   */
  private verifyStepOutput(step: ExecutionStep, result: AgentResult): boolean {
    if (!result.success) return false;
    if (step.agentId === "copy-agent") {
      return Boolean(result.data.headlines || result.data.primaryHeadline || result.summary);
    }
    if (step.agentId === "web-coding-agent") {
      return Boolean(result.data.preview || result.data.page || result.summary);
    }
    if (step.agentId === "research-agent") {
      return Boolean(result.data.painPoints || result.data.competitorGaps || result.summary);
    }
    return true;
  }

  /**
   * Persists record to ExecutionHistoryService.
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
  ): void {
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
      // Non-blocking audit logger
    }
  }

  /**
   * Synthesizes step results into a polished, unified executive response.
   */
  private synthesizePlanResponse(plan: ExecutionPlan, results: AgentResult[]): string {
    // If only one agent ran, return its clear summary directly
    if (results.length === 1) {
      return results[0].summary;
    }

    // For multi-agent workflows, present the cohesive result
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
