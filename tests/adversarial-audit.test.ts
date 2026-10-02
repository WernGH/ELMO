import { describe, it, expect, beforeEach } from "vitest";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { DynamicTaskPlannerService } from "@/services/agentic/dynamic-task-planner.service";
import { KnowledgeStoreService } from "@/services/knowledge/knowledge-store.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";

describe("Adversarial AI-Native Runtime Audit", () => {
  const orchestrator = ElmoOrchestratorService.getInstance();
  const planner = DynamicTaskPlannerService.getInstance();
  const store = KnowledgeStoreService.getInstance();
  const memoryService = ElmoMemoryService.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.clearAll();
    orchestrator.reset();
  });

  it("TEST 1: Novel Business Problem — Profitability vs Revenue Divergence", async () => {
    const prompt = "I run a small business that has been operating for several years. Something has changed recently: customers are still coming in, but the business feels less profitable even though revenue does not appear dramatically different. I don't know whether the issue is pricing, customer mix, operating costs, staff utilization, repeat business, or something else. Investigate what information you need, determine the most appropriate workflow, and help me identify the highest-impact issue.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== TEST 1 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Outcome Status:", result.businessOutcomeStatus);
    console.log("Plan ID:", result.plan?.id);
    console.log("Goal:", JSON.stringify(result.plan?.goal));
    console.log("Information Required:", result.plan?.informationRequired);
    console.log("Missing Information:", result.plan?.missingInformation);
    console.log("Selected Skills:", result.plan?.selectedSkills);
    console.log("Selected Tools:", result.plan?.selectedTools);
    console.log("Steps:", result.plan?.steps.map(s => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
      deps: s.dependencies,
      approval: s.approvalRequired
    })));
    console.log("Agent Results:", result.agentResults.map(r => ({
      agent: r.agentId,
      toolsUsed: r.toolsUsed,
      summary: r.summary.slice(0, 80)
    })));
    console.log("Canonical Execution:", {
      status: result.canonicalExecution?.status,
      businessOutcomeStatus: result.canonicalExecution?.businessOutcomeStatus,
      executedTools: result.canonicalExecution?.executedTools
    });

    expect(result.visualState).toBeDefined();
  });

  it("TEST 2: Unusual Objective — Harder to Operate Without Producing Additional Value", async () => {
    const prompt = "I don't think my main problem is getting more customers. I think the business is becoming harder to operate without producing enough additional value. Analyze what could be happening and determine what I should investigate first.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== TEST 2 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map(s => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools
    })));
    console.log("Selected Agents:", result.plan?.steps.map(s => s.agentId));
    console.log("Agent Results Tools:", result.agentResults.flatMap(r => r.toolsUsed));
    expect(result.visualState).toBeDefined();
  });

  it("TEST 3: Cross-Domain Objective — Founder Involvement Escalation", async () => {
    const prompt = "I want to understand why the business requires more of my personal involvement every month even though we have more customers and more activity than before. Identify what information you need and determine what parts of the business should be investigated.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== TEST 3 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map(s => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools
    })));
    console.log("Selected Agents:", result.plan?.steps.map(s => s.agentId));
    expect(result.visualState).toBeDefined();
  });

  it("TEST 4: Unknown Industry / Niche", async () => {
    const prompt = "I operate a specialized business in a niche you have not been explicitly configured for. A key performance indicator has deteriorated recently, but I don't know why. Analyze the situation using whatever business knowledge and capabilities are available and tell me what needs to be investigated.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== TEST 4 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map(s => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools
    })));
    console.log("Selected Agents:", result.plan?.steps.map(s => s.agentId));
    expect(result.visualState).toBeDefined();
  });

  it("TEST 5: Missing Data — Vague Money Losing Prompt", async () => {
    const prompt = "My business is losing money. Fix it.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== TEST 5 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Business Outcome Status:", result.businessOutcomeStatus);
    console.log("Clarification Questions:", result.clarificationQuestions);
    console.log("Plan Steps Count:", result.plan?.steps.length);
    console.log("Response Snippet:", result.response.slice(0, 150));
    expect(result.visualState).toBeDefined();
  });

  it("TEST 6: No Tool Available Scenario", async () => {
    const prompt = "Retrieve real-time satellite imagery of my retail storefront parking lot and calculate foot traffic density.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== TEST 6 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map(s => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools
    })));
    console.log("Executed Tools:", result.canonicalExecution?.executedTools);
    console.log("Response:", result.response.slice(0, 200));
    expect(result.visualState).toBeDefined();
  });
});
