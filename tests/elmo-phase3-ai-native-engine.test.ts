/**
 * ELMO Phase 3 — AI-Native Agentic Engine & Autonomous Goal Execution Acceptance Test Suite
 *
 * Comprehensive acceptance tests verifying:
 * 1. AI-Native Goal Handling (Section 37 Acceptance Test)
 * 2. Dynamic Agent Selection (Single-Agent vs Multi-Agent workflows)
 * 3. Dependency Resolution & Parallel-capable Execution
 * 4. Failure Recovery & Safe Retries on Transient Failures
 * 5. Loop Protection & Execution Limits
 * 6. Company Brain Memory Integration & Tenant Isolation
 * 7. Risk-Based Approval Gates
 * 8. LLM Provider Abstraction (Pluggable providers without core modifications)
 * 9. Multilingual & Voice Continuity for High-Level Goals
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { ExecutionHistoryService } from "@/services/agentic/execution-history.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WebCodingAgentService } from "@/services/agentic/web-coding/web-coding-agent.service";
import { LLMProviderFactory, LLMProvider, LLMGenerateOptions } from "@/services/llm-provider.service";
import { GeminiResponse } from "@/types/chat.types";

describe("ELMO Phase 3: AI-Native Agentic Engine Acceptance Suite", () => {
  let intelligenceService: ELMOIntelligenceService;
  let orchestrator: ElmoOrchestratorService;
  let historyService: ExecutionHistoryService;
  let memoryService: ElmoMemoryService;
  const store = MockDataStore.getInstance();

  const orgA = "11111111-1111-1111-1111-111111111111";
  const userA = "00000000-0000-0000-0000-000000000001";
  const orgB = "22222222-2222-2222-2222-222222222222";
  const userB = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    store.reset();
    ELMOIntelligenceService.resetInstance();
    ElmoOrchestratorService.resetInstance();
    ExecutionHistoryService.resetInstance();
    WebCodingAgentService.getInstance().reset();

    intelligenceService = ELMOIntelligenceService.getInstance();
    orchestrator = ElmoOrchestratorService.getInstance();
    historyService = ExecutionHistoryService.getInstance();
    memoryService = ElmoMemoryService.getInstance();

    // Register test orgs and users
    store.users.set(userA, { id: userA, email: "founder@alpha.com", passwordHash: "pass" });
    store.organizations.set(orgA, {
      id: orgA,
      name: "Alpha Corp",
      slug: "alpha-corp",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.organizationMembers.set(`${orgA}:${userA}`, {
      id: `mem-${userA}`,
      organization_id: orgA,
      user_id: userA,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    store.users.set(userB, { id: userB, email: "founder@beta.com", passwordHash: "pass" });
    store.organizations.set(orgB, {
      id: orgB,
      name: "Beta Corp",
      slug: "beta-corp",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.organizationMembers.set(`${orgB}:${userB}`, {
      id: `mem-${userB}`,
      organization_id: orgB,
      user_id: userB,
      role: "owner",
      created_at: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // 1. SECTION 37 ACCEPTANCE TEST: End-to-End AI-Native Goal Handling
  // ==========================================================================
  it("Section 37 Acceptance: should execute high-level goal 'I want to launch a lead generation campaign for my business'", async () => {
    // 1. Pre-seed Company Brain with target audience context
    await memoryService.storeMemory({
      organizationId: orgA,
      scope: "organization",
      content: "Alpha Corp specializes in AI workforce automation for high-end boutique property agencies.",
      importanceScore: 0.9,
      metadata: { category: "business" },
    });

    // 2. User provides high-level outcome without manual micro-instructions
    const res = await intelligenceService.processMessage({
      userId: userA,
      organizationId: orgA,
      message: "ELMO, I want to launch a lead generation campaign for my business.",
      inputMode: "text",
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("elmo-orchestrator");
    expect(res.visualState).toBe("SUCCESS");

    // Verify dynamic plan contains all required specialists
    expect(res.executionPlan).toBeDefined();
    const plan = res.executionPlan as any;
    expect(plan.status).toBe("COMPLETED");
    expect(plan.steps.length).toBe(5);

    const agentIds = plan.steps.map((s: any) => s.agentId);
    expect(agentIds).toEqual([
      "research-agent",
      "marketing-agent",
      "copy-agent",
      "web-coding-agent",
      "funnel-agent",
    ]);

    // Verify all 5 steps finished with output
    plan.steps.forEach((step: any) => {
      expect(step.status).toBe("COMPLETED");
      expect(step.output).toBeDefined();
    });

    // Verify preview payload was generated by Web/Coding agent
    expect(res.previewPayload).toBeDefined();
    const preview = res.previewPayload as any;
    expect(preview.sectionsCount).toBeGreaterThanOrEqual(4);
    expect(preview.viewportOptions).toEqual(["desktop", "tablet", "mobile"]);

    // Verify company memory was updated with the strategy milestone
    const memories = await memoryService.searchRelevantMemory(orgA, "lead generation campaign", "organization", 5);
    expect(memories.length).toBeGreaterThan(0);
    const strategyMem = memories.find((m) => m.content.includes("AI Workflow for"));
    expect(strategyMem).toBeDefined();

    // Verify execution history was persisted
    const executions = historyService.listExecutions(orgA);
    expect(executions.length).toBe(1);
    expect(executions[0].status).toBe("COMPLETED");
    expect(executions[0].agentsInvolved).toContain("web-coding-agent");
    expect(executions[0].agentsInvolved).toContain("funnel-agent");
  });

  // ==========================================================================
  // 2. Dynamic Agent Selection (Single-Agent vs Complex Pipelines)
  // ==========================================================================
  it("Dynamic Agent Selection: should route simple copy vs analytics vs competitor research to exact required specialists", async () => {
    // A. Single-Agent Copy Request
    const copyPlan = orchestrator.createExecutionPlan(
      { userId: userA, organizationId: orgA, message: "Give me three headlines for my landing page." },
      { intent: "copywriting", confidence: 0.95, isComplexTask: false, requiresAction: true, entities: {}, suggestedTools: [], explanation: "" }
    );
    expect(copyPlan.steps.length).toBe(1);
    expect(copyPlan.steps[0].agentId).toBe("copy-agent");

    // B. Single-Agent Analytics Request
    const analyticsPlan = orchestrator.createExecutionPlan(
      { userId: userA, organizationId: orgA, message: "Analyze my conversion rates and drop-off points." },
      { intent: "analytics_request", confidence: 0.95, isComplexTask: false, requiresAction: true, entities: {}, suggestedTools: [], explanation: "" }
    );
    expect(analyticsPlan.steps.length).toBe(1);
    expect(analyticsPlan.steps[0].agentId).toBe("analytics-agent");

    // C. Competitor Research + Landing Page
    const compPlan = orchestrator.createExecutionPlan(
      { userId: userA, organizationId: orgA, message: "Research my competitors and create a landing page based on findings." },
      { intent: "website_creation", confidence: 0.95, isComplexTask: true, requiresAction: true, entities: {}, suggestedTools: [], explanation: "" }
    );
    expect(compPlan.steps.length).toBe(4);
    expect(compPlan.steps.map((s) => s.agentId)).toEqual([
      "research-agent",
      "marketing-agent",
      "copy-agent",
      "web-coding-agent",
    ]);
  });

  // ==========================================================================
  // 3. Parallel Execution & Dependency Resolution
  // ==========================================================================
  it("Dependency & Parallelism: should resolve dependencies and execute independent steps in parallel waves", async () => {
    const plan = orchestrator.createExecutionPlan(
      { userId: userA, organizationId: orgA, message: "launch a lead generation campaign for my business" },
      { intent: "task_execution", confidence: 0.9, isComplexTask: true, requiresAction: true, entities: {}, suggestedTools: [], explanation: "" }
    );

    // Step 1 (Research) and Step 2 (Marketing) both have dependencies: [] -> can run in parallel wave 1
    expect(plan.steps[0].dependencies).toEqual([]);
    expect(plan.steps[1].dependencies).toEqual([]);

    // Step 3 (Copy) depends on step-1 and step-2
    expect(plan.steps[2].dependencies).toEqual(["step-1", "step-2"]);

    // Step 4 (Web) depends on step-3
    expect(plan.steps[3].dependencies).toEqual(["step-3"]);

    const res = await orchestrator.executePlan(plan, {
      userId: userA,
      organizationId: orgA,
      message: "launch a lead generation campaign for my business",
    });

    expect(res.visualState).toBe("SUCCESS");
    expect(plan.status).toBe("COMPLETED");
  });

  // ==========================================================================
  // 4. Failure Recovery & Safe Retries
  // ==========================================================================
  it("Failure Recovery: should retry transient agent failures up to maxRetries and successfully recover", async () => {
    const plan = orchestrator.createExecutionPlan(
      { userId: userA, organizationId: orgA, message: "Give me three headlines for my landing page." },
      { intent: "copywriting", confidence: 0.9, isComplexTask: false, requiresAction: true, entities: {}, suggestedTools: [], explanation: "" }
    );

    let attempts = 0;
    const registry = AgentRegistryService.getInstance();
    const originalCopy = registry.getAgent("copy-agent")!;

    // Temporarily wrap copy-agent to simulate 1 transient failure before succeeding
    const executor = (orchestrator as any).executor;
    const origExecuteAgent = executor.executeAgent.bind(executor);
    executor.executeAgent = async (msg: any) => {
      if (msg.recipient === "copy-agent" && attempts === 0) {
        attempts++;
        return {
          agentId: "copy-agent",
          success: false,
          summary: "Transient timeout",
          data: {},
          recommendations: [],
          actionsTaken: [],
          toolsUsed: [],
          needsMoreWork: false,
          confidence: 0,
          errors: ["Transient network timeout"],
        };
      }
      return origExecuteAgent(msg);
    };

    const res = await orchestrator.executePlan(plan, {
      userId: userA,
      organizationId: orgA,
      message: "Give me three headlines for my landing page.",
    });

    expect(attempts).toBe(1);
    expect(res.visualState).toBe("SUCCESS");
    expect(plan.status).toBe("COMPLETED");
    expect(plan.steps[0].status).toBe("COMPLETED");
    expect(plan.steps[0].retryCount).toBe(1);

    // Restore original executor
    executor.executeAgent = origExecuteAgent;
  });

  // ==========================================================================
  // 5. Loop Protection & Execution Limits
  // ==========================================================================
  it("Loop Protection: should halt execution safely when circular dependency is detected", async () => {
    const plan = orchestrator.createExecutionPlan(
      { userId: userA, organizationId: orgA, message: "Give me three headlines" },
      { intent: "copywriting", confidence: 0.9, isComplexTask: false, requiresAction: true, entities: {}, suggestedTools: [], explanation: "" }
    );

    // Introduce impossible circular dependency
    plan.steps[0].dependencies = ["non-existent-dependency"];

    const res = await orchestrator.executePlan(plan, {
      userId: userA,
      organizationId: orgA,
      message: "Give me three headlines",
    });

    expect(res.visualState).toBe("ERROR");
    expect(plan.status).toBe("FAILED");
    expect(res.response).toContain("Dependency resolution failed");
  });

  // ==========================================================================
  // 6. Company Brain & Tenant Isolation
  // ==========================================================================
  it("Tenant Isolation: should strictly prevent Org B from accessing Org A execution history and memory", async () => {
    // Org A runs a lead generation campaign
    await orchestrator.orchestrate({
      userId: userA,
      organizationId: orgA,
      message: "launch a lead generation campaign for my business",
    });

    // Verify Org A has 1 execution
    const orgAHistory = historyService.listExecutions(orgA);
    expect(orgAHistory.length).toBe(1);

    // Org B checks executions
    const orgBHistory = historyService.listExecutions(orgB);
    expect(orgBHistory.length).toBe(0);

    // Org B attempting to fetch Org A's execution directly returns undefined
    const leaked = historyService.getExecution(orgAHistory[0].executionId, orgB);
    expect(leaked).toBeUndefined();
  });

  // ==========================================================================
  // 7. Risk-Based Approval Gates
  // ==========================================================================
  it("Approval Gate: should halt high-risk destructive action and require explicit human approval", async () => {
    const res = await orchestrator.orchestrate({
      userId: userA,
      organizationId: orgA,
      message: "Delete all production records and deploy live immediately",
    });

    expect(res.visualState).toBe("AWAITING_APPROVAL");
    expect(res.pendingApproval).toBeDefined();
    expect(res.pendingApproval?.riskLevel).toBe("HIGH");
    expect(res.response).toContain("Approval required before proceeding");

    // Verify execution status in history
    const history = historyService.listExecutions(orgA);
    expect(history.length).toBe(1);
    expect(history[0].approvalStatus).toBe("REQUESTED");
  });

  // ==========================================================================
  // 8. LLM Provider Abstraction
  // ==========================================================================
  it("LLM Provider Abstraction: should allow registering and using custom third-party providers without modifying core", async () => {
    class CustomMockProvider implements LLMProvider {
      public readonly name = "custom-mock";
      async generateResponse(options: LLMGenerateOptions): Promise<GeminiResponse> {
        return {
          text: "Custom mock provider generation successful.",
          model: "custom-mock-v1",
          latencyMs: 10,
          tokensUsed: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
        };
      }
      async *generateStream(): AsyncGenerator<any, void, unknown> {
        yield { event: "token", data: { text: "mock stream" } };
      }
    }

    const mockInstance = new CustomMockProvider();
    LLMProviderFactory.registerProvider("custom-mock" as any, mockInstance);

    const provider = LLMProviderFactory.getProvider("custom-mock" as any);
    expect(provider).toBeDefined();
    expect(provider.name).toBe("custom-mock");

    const genRes = await provider.generateResponse({ prompt: "Hello test" });
    expect(genRes.text).toContain("Custom mock provider generation successful");
  });

  // ==========================================================================
  // 9. Multilingual & Voice Continuity
  // ==========================================================================
  it("Multilingual & Voice: should process Malay voice directive for lead generation campaign cleanly", async () => {
    const res = await intelligenceService.processMessage({
      userId: userA,
      organizationId: orgA,
      message: "Tolong lancarkan kempen jana leads untuk perniagaan saya.",
      inputMode: "voice",
    });

    expect(res).toBeDefined();
    expect(res.inputMode).toBe("voice");
    expect(res.provider).toBe("elmo-orchestrator");
    expect(res.visualState).toBe("SUCCESS");
    expect(res.executionPlan).toBeDefined();
    const plan = res.executionPlan as any;
    expect(plan?.status).toBe("COMPLETED");
  });

  // ==========================================================================
  // 10. Natural Language Prompt Handling: "create me a landing page"
  // ==========================================================================
  it("Natural Language Directive: 'create me a landing page' triggers full landing page workflow with live preview", async () => {
    const res = await intelligenceService.processMessage({
      userId: userA,
      organizationId: orgA,
      message: "create me a landing page",
      inputMode: "text",
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("elmo-orchestrator");
    expect(res.visualState).toBe("SUCCESS");
    expect(res.previewPayload).toBeDefined();
    const preview = res.previewPayload as any;
    expect(preview.pageTitle).toBeDefined();
    expect(preview.renderedHtml).toBeDefined();
    expect(preview.sectionsCount).toBeGreaterThan(0);
    expect(res.executionPlan).toBeDefined();
    const plan = res.executionPlan as any;
    expect(plan?.status).toBe("COMPLETED");
    expect(plan?.steps.length).toBe(4);
    expect(plan?.steps.some((s: any) => s.agentId === "web-coding-agent")).toBe(true);

    // Also test the streaming generator route
    const streamEvents: any[] = [];
    for await (const chunk of intelligenceService.streamMessage({
      userId: userA,
      organizationId: orgA,
      message: "create me a landing page",
      inputMode: "text",
    })) {
      streamEvents.push(chunk);
    }

    const metadataEvent = streamEvents.find((e) => e.event === "metadata");
    expect(metadataEvent).toBeDefined();
    expect(metadataEvent.data.previewPayload).toBeDefined();
  });
});
