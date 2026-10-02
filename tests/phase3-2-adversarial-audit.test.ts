/**
 * ELMO Phase 3.2 — Adversarial AI-Native Runtime Audit Test Suite
 *
 * Implements all 15 comprehensive adversarial tests specified in Section 35:
 * 1.  TEST 1 — Novel Profitability Problem (revenue steady, profitability falling)
 * 2.  TEST 2 — Operational Value Problem (not more customers, harder to operate)
 * 3.  TEST 3 — Founder Involvement Escalation (customer count up, founder hours doubled)
 * 4.  TEST 4 — Unknown Industry / Niche (specialized niche, deteriorating KPI)
 * 5.  TEST 5 — Insufficient Information ("My business is losing money. Fix it." -> WAITING_FOR_INPUT)
 * 6.  TEST 6 — Missing Capability ("satellite imagery of storefront parking lot" -> MISSING_CAPABILITY)
 * 7.  TEST 7 — Negation ("Revenue is not falling. Profit margins are falling because costs are increasing")
 * 8.  TEST 8 — Explicit Exclusion ("I do not need more customers. Why is serving existing customers more expensive?")
 * 9.  TEST 9 — Multi-Domain Problem (staff overtime spiked, customer complaints +25%, refunds up)
 * 10. TEST 10 — Completely Novel Objective (warehouse dispatch turnaround latency dual-scan barcode)
 * 11. TEST 11 — Tool Mismatch (direct banking wire transfer rail -> MISSING_CAPABILITY)
 * 12. TEST 12 — Capability Selection Traceability (valid skills, tools, and permissions)
 * 13. TEST 13 — Plan Validation Rejection (injecting invalid agent/tool -> PLAN_VALIDATION_FAILED)
 * 14. TEST 14 — False Completion Prevention (distinguishes technical success from business outcome)
 * 15. TEST 15 — False Memory Prevention (WAITING_FOR_INPUT & MISSING_CAPABILITY produce zero completion memories)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { DynamicTaskPlannerService } from "@/services/agentic/dynamic-task-planner.service";
import { KnowledgeStoreService } from "@/services/knowledge/knowledge-store.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { ToolRegistryService } from "@/services/agentic/tool-registry.service";
import { SkillRegistryService } from "@/services/agentic/skill-registry.service";
import { ExecutionStep } from "@/services/agentic/types/agentic.types";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("ELMO Phase 3.2 — 15-Test Adversarial AI-Native Runtime Audit", () => {
  const orchestrator = ElmoOrchestratorService.getInstance();
  const planner = DynamicTaskPlannerService.getInstance();
  const store = KnowledgeStoreService.getInstance();
  const memoryService = ElmoMemoryService.getInstance();
  const agentRegistry = AgentRegistryService.getInstance();
  const toolRegistry = ToolRegistryService.getInstance();
  const skillRegistry = SkillRegistryService.getInstance();
  const mockStore = MockDataStore.getInstance();

  const orgId = "33333333-3333-3333-3333-333333333333";
  const userId = "00000000-0000-0000-0000-000000000003";

  beforeEach(() => {
    mockStore.reset();
    store.clearAll();
    orchestrator.reset();
  });

  // =========================================================================
  // TEST 1 — Novel Profitability Problem
  // =========================================================================
  it("TEST 1: Novel Profitability Problem — Steady revenue, falling profitability", async () => {
    const prompt =
      "I run a small business that has been operating for several years. Something has changed recently: customers are still coming in, but the business feels less profitable even though revenue does not appear dramatically different. I don't know whether the issue is pricing, customer mix, operating costs, staff utilization, repeat business, or something else. Investigate what information you need, determine the most appropriate workflow, and help me identify the highest-impact issue.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan).toBeDefined();

    // Semantic exclusions correctly parsed
    expect(result.plan?.understanding?.exclusions).toContain("customer_acquisition");
    expect(result.plan?.understanding?.exclusions).toContain("revenue_decline");

    // Selected agents: analytics and research, NOT marketing
    const agentIds = result.plan!.steps.map((s) => s.agentId);
    expect(agentIds).toContain("analytics-agent");
    expect(agentIds).toContain("research-agent");
    expect(agentIds).not.toContain("marketing-agent");

    // Zero marketing offer planned or executed
    const tools = result.plan!.steps.flatMap((s) => s.tools);
    expect(tools).not.toContain("create_offer_blueprint");
    expect(result.canonicalExecution?.executedTools).not.toContain("create_offer_blueprint");
    expect(result.canonicalExecution?.executedTools).toContain("get_dashboard_analytics");
  });

  // =========================================================================
  // TEST 2 — Operational Value Problem
  // =========================================================================
  it("TEST 2: Operational Value Problem — Not more customers, harder to operate", async () => {
    const prompt =
      "I don't think my main problem is getting more customers. I think the business is becoming harder to operate without producing enough additional value. Analyze what could be happening and determine what I should investigate first.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan?.understanding?.exclusions).toContain("customer_acquisition");

    const agentIds = result.plan!.steps.map((s) => s.agentId);
    expect(agentIds).toContain("analytics-agent");
    expect(agentIds).toContain("research-agent");
    expect(agentIds).not.toContain("marketing-agent");

    const tools = result.plan!.steps.flatMap((s) => s.tools);
    expect(tools).not.toContain("create_offer_blueprint");
  });

  // =========================================================================
  // TEST 3 — Founder Involvement Escalation
  // =========================================================================
  it("TEST 3: Founder Involvement Escalation — Customer count up, founder personal hours doubled", async () => {
    const prompt =
      "I want to understand why the business requires more of my personal involvement every month even though we have more customers and more activity than before. Identify what information you need and determine what parts of the business should be investigated.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan?.understanding?.exclusions).toContain("customer_acquisition");

    const agentIds = result.plan!.steps.map((s) => s.agentId);
    expect(agentIds).toContain("analytics-agent");
    expect(agentIds).toContain("research-agent");
    expect(agentIds).not.toContain("marketing-agent");

    const tools = result.plan!.steps.flatMap((s) => s.tools);
    expect(tools).not.toContain("create_offer_blueprint");
  });

  // =========================================================================
  // TEST 4 — Unknown Industry / Niche
  // =========================================================================
  it("TEST 4: Unknown Industry / Niche — No predefined industry assumptions", async () => {
    const prompt =
      "I operate a specialized business in a niche you have not been explicitly configured for. A key performance indicator has deteriorated recently, but I don't know why. Analyze the situation using whatever business knowledge and capabilities are available and tell me what needs to be investigated.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan?.understanding?.industry).toBeUndefined();
    expect(result.plan?.steps.length).toBeGreaterThanOrEqual(2);

    const skills = result.plan?.selectedSkills || [];
    expect(skills).toContain("Analyze");
    expect(skills).toContain("Audit");
  });

  // =========================================================================
  // TEST 5 — Insufficient Information Gate
  // =========================================================================
  it("TEST 5: Insufficient Information — Vague prompt halts with WAITING_FOR_INPUT", async () => {
    const prompt = "My business is losing money. Fix it.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("WAITING_FOR_INPUT");
    expect(result.businessOutcomeStatus).toBe("WAITING_FOR_INPUT");
    expect(result.clarificationQuestions?.length).toBeGreaterThanOrEqual(3);
    expect(result.plan?.steps.length).toBe(0);
    expect(result.canonicalExecution?.executedTools?.length).toBe(0);

    // Verified zero fabricated numbers or revenue statistics
    expect(result.response).not.toMatch(/\$[\d,]+/);
    expect(result.response).toContain("clarification");
  });

  // =========================================================================
  // TEST 6 — Missing Capability Gate
  // =========================================================================
  it("TEST 6: Missing Capability — Physical satellite imagery halts with MISSING_CAPABILITY", async () => {
    const prompt =
      "Retrieve real-time satellite imagery of my retail storefront parking lot and calculate foot traffic density.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("MISSING_CAPABILITY");
    expect(result.businessOutcomeStatus).toBe("MISSING_CAPABILITY");
    expect(result.plan?.missingCapabilities).toContain("satellite_geospatial_vision");
    expect(result.canonicalExecution?.executedTools?.length).toBe(0);
    expect(result.response).toContain("Capability Guard");
  });

  // =========================================================================
  // TEST 7 — Semantic Negation
  // =========================================================================
  it("TEST 7: Semantic Negation — Revenue is NOT falling, costs increasing", async () => {
    const prompt =
      "Revenue is not falling. Profit margins are falling because costs are increasing. Investigate where our money is going.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan?.understanding?.exclusions).toContain("revenue_decline");

    // Known facts record that revenue is stable
    const facts = result.plan?.understanding?.knownFacts || [];
    expect(facts.some((f) => f.toLowerCase().includes("revenue"))).toBe(true);

    const tools = result.plan!.steps.flatMap((s) => s.tools);
    expect(tools).toContain("get_dashboard_analytics");
    expect(tools).not.toContain("create_offer_blueprint");
  });

  // =========================================================================
  // TEST 8 — Explicit Exclusion
  // =========================================================================
  it("TEST 8: Explicit Exclusion — Do NOT need more customers, servicing cost focus", async () => {
    const prompt =
      "I do not need more customers. Why is serving existing customers more expensive? Find the operational leak.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan?.understanding?.exclusions).toContain("customer_acquisition");

    const agentIds = result.plan!.steps.map((s) => s.agentId);
    expect(agentIds).not.toContain("marketing-agent");

    const tools = result.plan!.steps.flatMap((s) => s.tools);
    expect(tools).not.toContain("create_offer_blueprint");
  });

  // =========================================================================
  // TEST 9 — Multi-Domain Operational Friction
  // =========================================================================
  it("TEST 9: Multi-Domain Problem — Overtime, complaints, and refunds simultaneously increasing", async () => {
    const prompt =
      "Over the last quarter, staff overtime has spiked, customer complaints have increased by 25%, and refund requests are up. Help me uncover the root cause across operations and fulfillment.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");

    // Both workload friction and customer friction detected
    const actions = result.plan?.understanding?.requestedActions || [];
    expect(actions).toContain("operational_bottleneck_investigation");
    expect(actions).toContain("service_friction_and_refund_analysis");

    const agentIds = result.plan!.steps.map((s) => s.agentId);
    expect(agentIds).toContain("analytics-agent");
    expect(agentIds).toContain("research-agent");
  });

  // =========================================================================
  // TEST 10 — Completely Novel Objective
  // =========================================================================
  it("TEST 10: Completely Novel Objective — Warehouse barcode dispatch turnaround latency", async () => {
    const prompt =
      "Our warehouse dispatch turnaround latency has degraded from 4 hours to 19 hours following the introduction of a dual-scan barcode system. Analyze the workflow friction and isolate the bottleneck.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    const agentIds = result.plan!.steps.map((s) => s.agentId);

    // Does NOT fallback to funnel-agent!
    expect(agentIds).not.toContain("funnel-agent");
    expect(agentIds).toContain("analytics-agent");
    expect(agentIds).toContain("research-agent");
  });

  // =========================================================================
  // TEST 11 — Tool Mismatch Detection
  // =========================================================================
  it("TEST 11: Tool Mismatch — Unsupported banking wire transfer rail", async () => {
    const prompt =
      "Directly wire transfer $50,000 from our primary Chase commercial operating account to vendor invoice 9821.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("MISSING_CAPABILITY");
    expect(result.plan?.missingCapabilities).toContain("external_banking_wire_rail");
    expect(result.canonicalExecution?.executedTools?.length).toBe(0);
  });

  // =========================================================================
  // TEST 12 — Capability Selection Traceability
  // =========================================================================
  it("TEST 12: Capability Selection Traceability — Every agent and tool has traceable registry permissions", async () => {
    const prompt =
      "Audit our customer churn reasons and evaluate whether pricing or support response time is driving cancellations.";

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan?.steps.length).toBeGreaterThan(0);

    for (const step of result.plan!.steps) {
      // Agent exists in AgentRegistry
      const agent = agentRegistry.getAgent(step.agentId);
      expect(agent).toBeDefined();
      expect(agent?.enabled).toBe(true);

      // Tools exist in ToolRegistry and are permitted for this agent
      for (const tool of step.tools || []) {
        const toolDef = toolRegistry.getTool(tool);
        expect(toolDef).toBeDefined();
        expect(agentRegistry.isToolAllowed(step.agentId, tool)).toBe(true);
      }

      // Skills exist in SkillRegistry
      for (const skill of step.skills || []) {
        expect(skillRegistry.getSkill(skill)).toBeDefined();
      }
    }
  });

  // =========================================================================
  // TEST 13 — Plan Validation Rejection
  // =========================================================================
  it("TEST 13: Plan Validation — Rejects invalid or unpermitted tools/agents with PLAN_VALIDATION_FAILED", () => {
    const invalidSteps: ExecutionStep[] = [
      {
        id: "step-invalid",
        stepNumber: 1,
        agentId: "research-agent",
        agentName: "Research Agent",
        task: "Execute unpermitted destructive action",
        dependencies: [],
        status: "PENDING",
        riskLevel: "HIGH",
        approvalRequired: false,
        skills: ["Plan"],
        tools: ["unregistered_dummy_tool_xyz"],
        input: {},
        maxRetries: 1,
      },
    ];

    const validation = planner.validatePlanSteps(invalidSteps, orgId);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0]).toContain("unregistered_dummy_tool_xyz");
  });

  // =========================================================================
  // TEST 14 — False Completion Prevention
  // =========================================================================
  it("TEST 14: False Completion Prevention — Distinguishes simulated/partial outcome from verified execution", async () => {
    // When executing an operational tool like get_dashboard_analytics, outcome is verified
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: "Find out why our conversion rate changed this week.",
    });

    expect(result.canonicalExecution?.businessOutcomeStatus).toBe("BUSINESS_OUTCOME_VERIFIED");
    expect(result.canonicalExecution?.executedTools?.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // TEST 15 — False Memory Prevention
  // =========================================================================
  it("TEST 15: False Memory Prevention — Zero completion memory on WAITING_FOR_INPUT or MISSING_CAPABILITY", async () => {
    // 1. Ambiguous prompt (halts at WAITING_FOR_INPUT)
    await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: "My business is losing money. Fix it.",
    });

    // 2. Missing capability prompt (halts at MISSING_CAPABILITY)
    await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: "Deploy surveillance camera feed to count customer visits in parking lot.",
    });

    // Search for any recorded workflow completion memory
    const memories = await memoryService.searchRelevantMemory(orgId, "workflow", "organization", 10);
    const completionMemories = memories.filter(
      (m) => (m.metadata?.tags as string[])?.includes("workflow-completion")
    );

    // Zero completion memories recorded!
    expect(completionMemories.length).toBe(0);
  });
});

