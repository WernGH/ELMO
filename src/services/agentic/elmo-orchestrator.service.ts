/**
 * ELMO Phase 3 — Central Orchestrator Service (ElmoOrchestratorService)
 *
 * Coordinates multi-agent planning, sequential execution, loop protection,
 * and unified response synthesis directly underneath ELMO Central Brain.
 */

import {
  AgentMessage,
  AgentResult,
  ExecutionPlan,
  ExecutionStep,
  PlanStatus,
  RiskLevel,
  PendingApprovalDetails,
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { AgentExecutorService } from "./agent-executor.service";
import { ElmoIntentService, IntentAnalysisResult } from "@/services/elmo-intent.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";

export interface OrchestratorInput {
  userId: string;
  organizationId: string;
  conversationId?: string;
  message: string;
  intentAnalysis?: IntentAnalysisResult;
  language?: string;
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

  // Stored plans: planId -> ExecutionPlan
  private activePlans: Map<string, ExecutionPlan> = new Map();

  private constructor() {
    this.registry = AgentRegistryService.getInstance();
    this.executor = AgentExecutorService.getInstance();
    this.intentService = ElmoIntentService.getInstance();
    this.memoryService = ElmoMemoryService.getInstance();
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
    const isDirectExplanation = /^(what is|explain|tell me about|terangkan|apakah)/i.test(lower) && !lower.includes("landing page") && !lower.includes("funnel");

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

    // 4. Controlled Execution with Loop Protection & Approval Gates
    return await this.executePlan(plan, input);
  }

  /**
   * Plans ordered steps based on the user's intent.
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
      lower.includes("build me a landing page") ||
      lower.includes("create a landing page") ||
      lower.includes("build a website") ||
      lower.includes("create a website") ||
      lower.includes("bina landing page") ||
      lower.includes("buat landing page");

    // Check for headline / copy specific request
    const isCopyOnly =
      (lower.includes("headline") || lower.includes("copy") || lower.includes("tajuk")) &&
      !isFullWebCreation &&
      !isWebEdit;

    // Check for analytics request
    const isAnalyticsOnly =
      lower.includes("analytics") ||
      lower.includes("metric") ||
      lower.includes("conversion rate") ||
      lower.includes("drop-off");

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
        input: { topic: raw },
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
      });
    } else if (isFullWebCreation) {
      // Multi-Agent Workflow: Marketing -> Copy -> Web/Coding -> Funnel
      // Extract target audience if mentioned
      let targetAudience = "Property Agents";
      if (lower.includes("property agent") || lower.includes("real estate")) {
        targetAudience = "Property Agents";
      } else if (lower.includes("consult") || lower.includes("coach")) {
        targetAudience = "Consultants & Coaches";
      }

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
        }
      );
    } else {
      // Default to Funnel Agent delegation for operational SaaS actions
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
        input: { message: raw },
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
      status: "PENDING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Executes a plan step-by-step with dependency checking, loop protection, and approval gates.
   */
  public async executePlan(plan: ExecutionPlan, input: OrchestratorInput): Promise<OrchestrationResult> {
    plan.status = "IN_PROGRESS";
    const agentResults: AgentResult[] = [];
    const MAX_HOPS = 5;
    let hops = 0;
    let previewPayload: unknown = null;

    // Execution context shared across sequential steps
    const accumulatedContext: Record<string, unknown> = {
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
    };

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      hops++;

      // Loop protection
      if (hops > MAX_HOPS) {
        plan.status = "FAILED";
        return {
          isDirectAnswer: false,
          response: "ELMO Safety Guard: Execution halted because the task exceeded maximum allowed agent hops.",
          plan,
          agentResults,
          visualState: "ERROR",
        };
      }

      // High-Risk Approval Check
      if (step.approvalRequired || step.riskLevel === "HIGH") {
        plan.status = "AWAITING_APPROVAL";
        step.status = "AWAITING_APPROVAL";
        const pendingDetails: PendingApprovalDetails = {
          stepId: step.id,
          agentId: step.agentId,
          actionTitle: step.task,
          description: `This action is classified as HIGH RISK and requires your explicit approval before execution.`,
          riskLevel: step.riskLevel,
          proposedChanges: step.input,
          requestedAt: Date.now(),
        };
        plan.approvalRequirements = pendingDetails;

        return {
          isDirectAnswer: false,
          response: `Approval required before proceeding with step "${step.task}". Please review and confirm.`,
          plan,
          agentResults,
          pendingApproval: pendingDetails,
          visualState: "AWAITING_APPROVAL",
        };
      }

      step.status = "IN_PROGRESS";
      step.startedAt = Date.now();
      plan.currentStepIndex = i;

      // Construct message for the agent
      const agentMsg: AgentMessage = {
        messageId: `msg-${Date.now()}-${i}`,
        executionId: plan.executionId,
        sender: "elmo-orchestrator",
        recipient: step.agentId,
        messageType: "TASK_REQUEST",
        task: step.task,
        context: accumulatedContext,
        input: { ...step.input, ...accumulatedContext },
        timestamp: Date.now(),
      };

      const result = await this.executor.executeAgent(agentMsg);
      agentResults.push(result);

      step.completedAt = Date.now();
      if (result.success) {
        step.status = "COMPLETED";
        step.output = result.data;
        step.summary = result.summary;

        // Merge output into accumulated context for downstream steps
        Object.assign(accumulatedContext, result.data);

        // Track preview payload if produced by Web/Coding agent
        if (result.data.preview) {
          previewPayload = result.data.preview;
        }
      } else {
        step.status = "FAILED";
        step.error = result.errors?.join(", ") || result.summary;
        plan.status = "FAILED";

        return {
          isDirectAnswer: false,
          response: `ELMO encountered an issue executing ${step.agentName}: ${step.error}`,
          plan,
          agentResults,
          visualState: "ERROR",
        };
      }
    }

    plan.status = "COMPLETED";
    plan.completedAt = Date.now();

    // Synthesize final unified response
    const finalResponse = this.synthesizePlanResponse(plan, agentResults);

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
   * Synthesizes step results into a polished, unified executive response.
   */
  private synthesizePlanResponse(plan: ExecutionPlan, results: AgentResult[]): string {
    // If only one agent ran, return its clear summary directly
    if (results.length === 1) {
      return results[0].summary;
    }

    // For multi-agent workflows, present the cohesive result
    let res = `I have completed the end-to-end execution for **"${plan.objective}"**:\n\n`;

    results.forEach((r, idx) => {
      const icon = r.agentId === "web-coding-agent" ? "🎨" : r.agentId === "copy-agent" ? "✍️" : r.agentId === "marketing-agent" ? "🎯" : "⚡";
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
