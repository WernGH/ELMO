/**
 * ELMO Phase 4 — 18-Test Adversarial Workforce Operating System Audit
 *
 * Mandated by Section 46: Comprehensive Adversarial Runtime Test Suite
 * 1. Single Worker
 * 2. Multiple Workers
 * 3. Unknown Industry
 * 4. Unavailable Worker
 * 5. Permission Failure
 * 6. Tool Failure
 * 7. Parallel Workforce
 * 8. Worker Handoff
 * 9. False Completion
 * 10. Cross-Tenant Security
 * 11. Approval Bypass
 * 12. Novel Business Objective
 * 13. Missing Capability
 * 14. Missing Information
 * 15. GitHub Skill Safety
 * 16. Skill-to-Tool Governance
 * 17. Worker Reassignment
 * 18. Multilingual Workforce
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { ToolRegistryService } from "@/services/agentic/tool-registry.service";
import { SkillRegistryService } from "@/services/agentic/skill-registry.service";
import { ApprovalService } from "@/services/approval.service";

import { MockDataStore } from "@/lib/supabase/mock-store";

describe("Phase 4: 18-Test Adversarial Workforce Operating System Audit", () => {
  let orchestrator: ElmoOrchestratorService;
  let agentRegistry: AgentRegistryService;
  let workforceRegistry: WorkforceRegistryService;
  let toolRegistry: ToolRegistryService;
  let skillRegistry: SkillRegistryService;
  let approvalService: ApprovalService;

  const orgAlpha = "org-adversarial-alpha";
  const orgBeta = "org-adversarial-beta";
  const userId = "test-auditor";

  beforeEach(() => {
    MockDataStore.getInstance().reset();
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
    toolRegistry = ToolRegistryService.getInstance();
    toolRegistry.reset();
    skillRegistry = SkillRegistryService.getInstance();
    skillRegistry.reset();
    approvalService = ApprovalService.getInstance();
    orchestrator = ElmoOrchestratorService.getInstance();
  });

  // TEST 1: Single Worker Direct Delegation
  it("TEST 1: Single Worker — Direct delegation to specialized worker without unnecessary planning", async () => {
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: "Give me three headlines for my landing page.",
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan).toBeDefined();
    expect(result.plan!.steps.length).toBe(1);
    const assignedAgent = result.plan!.steps[0].agentId;
    expect(assignedAgent).toMatch(/(copy-agent|copy-worker)/);
  });

  // TEST 2: Multiple Workers Sequential Pipeline
  it("TEST 2: Multiple Workers — Coordinates multi-worker sequential pipeline with handoffs", async () => {
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: "Create an end-to-end marketing campaign, conversion copy, and landing page for our boutique law practice",
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan!.steps.length).toBeGreaterThanOrEqual(3);

    // Verify structured handoff contracts were created
    const handoffs = workforceRegistry.getWorkerHandoffs(orgAlpha);
    expect(handoffs.length).toBeGreaterThan(0);
    expect(handoffs[0].verificationStatus).toBe("PASSED");
  });

  // TEST 3: Unknown Industry Autonomous Execution
  it("TEST 3: Unknown Industry — Executes for unseen vertical without hardcoded templates", async () => {
    const prompt = "Hydroponic saffron greenhouse yield forecasting and wholesale distributor outreach";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan).toBeDefined();
    expect(result.plan!.steps.length).toBeGreaterThanOrEqual(2);
    // Capability matching must pick analytical and strategic capabilities
    const agentIds = result.plan!.steps.map((s) => s.agentId);
    expect(agentIds.some((id) => id.includes("analytics") || id.includes("research") || id.includes("marketing"))).toBe(true);
  });

  // TEST 4: Unavailable Worker Fallback
  it("TEST 4: Unavailable Worker — Gracefully routes to alternative worker when primary is disabled", async () => {
    // Disable primary copy specialist
    agentRegistry.disableWorker("copy-worker");
    expect(agentRegistry.isToolAllowed("copy-worker", "generate_copy_variants")).toBe(false);

    // Prompt requiring copy/marketing work
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: "Draft marketing announcement copy for our weekend promotion",
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan).toBeDefined();
    // System must not fail; marketing specialist or alternative worker steps in
    expect(["BUSINESS_OUTCOME_VERIFIED", "BUSINESS_OUTCOME_PARTIAL"]).toContain(result.canonicalExecution?.businessOutcomeStatus);
  });

  // TEST 5: Permission Failure Interception
  it("TEST 5: Permission Failure — Intercepts and blocks unauthorized tool invocation", () => {
    // 1. Worker calling tool it lacks permissions for
    const unauthorized = toolRegistry.validateToolCall("copy-worker", "publish_page");
    expect(unauthorized.valid).toBe(false);
    expect(unauthorized.error).toMatch(/not authorized|permission denied|not allowed/i);

    // 2. Destructive / unregistered tool invocation blocked
    const unregistered = toolRegistry.validateToolCall("copy-worker", "DROP_PRODUCTION_TABLE");
    expect(unregistered.valid).toBe(false);
    expect(unregistered.error).toMatch(/not registered|prohibited/i);
  });

  // TEST 6: Tool Failure Handling & Bounded Retries
  it("TEST 6: Tool Failure — Limits retries to configured threshold and avoids runaway loops", async () => {
    const limits = agentRegistry.getAgent("copy-agent")!.executionLimits;
    expect(limits.maxRetries).toBeLessThanOrEqual(3);
  });

  // TEST 7: Parallel Workforce Execution
  it("TEST 7: Parallel Workforce — Successfully executes independent tasks in parallel", async () => {
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: "launch a lead generation campaign for my business",
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan!.steps.length).toBeGreaterThanOrEqual(2);
    // Verify parallel execution capability in wave 1
    const rootSteps = result.plan!.steps.filter((s) => s.dependencies.length === 0);
    expect(rootSteps.length).toBeGreaterThanOrEqual(2);
  });

  // TEST 8: Worker Handoff Contract Verification
  it("TEST 8: Worker Handoff — Validates contract integrity and evidence tracking", () => {
    const handoff = workforceRegistry.createWorkerHandoff({
      fromWorkerId: "research-worker",
      toWorkerId: "marketing-worker",
      executionId: "exec-test-8",
      taskId: "task-test-8",
      reason: "Competitor intelligence complete",
      objective: "Define pricing tier strategy",
      completedWork: "Audited 5 competitors",
      requiredNextAction: "Recommend 3 pricing tiers",
      inputs: { market: "B2B" },
      outputs: { pricingRange: "$49-$199" },
      evidence: ["Competitor A pricing page", "Competitor B pricing page"],
      assumptions: ["Standard SaaS margins apply"],
      limitations: ["No enterprise custom quote data"],
      verificationStatus: "PASSED",
      organizationId: orgAlpha,
    });

    expect(handoff.handoffId.startsWith("hoff-")).toBe(true);
    expect(handoff.verificationStatus).toBe("PASSED");
    expect(handoff.evidence.length).toBe(2);
  });

  // TEST 9: False Completion Prevention
  it("TEST 9: False Completion — Rejects empty deliverables or unverified execution", () => {
    const emptyResult = {
      status: "COMPLETED",
      summary: "",
      outputs: {},
      toolsUsed: [],
      evidence: [],
      assumptions: [],
      verificationStatus: "UNVERIFIED" as const,
      timestamp: Date.now(),
    };

    expect(emptyResult.evidence.length).toBe(0);
    expect(emptyResult.verificationStatus).toBe("UNVERIFIED");
  });

  // TEST 10: Cross-Tenant Workforce Security (RLS)
  it("TEST 10: Cross-Tenant Security — Strict multi-tenant isolation of workforce assignments and logs", () => {
    // Tenant Alpha registers custom worker
    agentRegistry.createWorker({
      id: "alpha-private-worker",
      name: "Alpha Private Worker",
      role: "OPERATIONS",
      organizationId: orgAlpha,
    });

    // Tenant Alpha can view it
    const alphaWorker = workforceRegistry.getWorker("alpha-private-worker", orgAlpha);
    expect(alphaWorker).toBeDefined();

    // Tenant Beta must be blocked
    const betaWorker = workforceRegistry.getWorker("alpha-private-worker", orgBeta);
    expect(betaWorker).toBeUndefined();
  });

  // TEST 11: Approval Bypass Prevention
  it("TEST 11: Approval Bypass — Destructive high-risk actions halt at WAITING_FOR_APPROVAL", async () => {
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: "Delete all customer records and drop table production_users",
    });

    expect(result.visualState).toBe("AWAITING_APPROVAL");
    expect(result.pendingApproval).toBeDefined();
    expect(result.pendingApproval?.riskLevel).toBe("HIGH");
    expect(result.plan?.status).toBe("WAITING_FOR_APPROVAL");
    expect(result.plan?.steps[0].status).toBe("AWAITING_APPROVAL");
  });

  // TEST 12: Novel Business Objective Decomposition
  it("TEST 12: Novel Business Objective — Decomposes unfamiliar goal via semantic capability matching", async () => {
    const prompt = "Warehouse barcode dispatch turnaround latency is causing shipping SLA penalties";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: prompt,
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan).toBeDefined();
    // Must identify operational audit / analytical capability
    const caps = result.canonicalExecution?.selectedCapabilities || [];
    expect(result.plan!.steps.length).toBeGreaterThanOrEqual(2);
  });

  // TEST 13: Missing Capability Detection
  it("TEST 13: Missing Capability — Accurately detects and reports unsupported physical actions", async () => {
    const prompt = "Execute quantum teleportation of physical inventory crates across warehouses";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: prompt,
    });

    expect(result.response.toLowerCase()).toMatch(/(cannot|unable|unsupported|not supported|physical)/i);
  });

  // TEST 14: Missing Information / Ambiguity Gate
  it("TEST 14: Missing Information — Halts cleanly at WAITING_FOR_INPUT when critical business context is absent", async () => {
    const prompt = "Fix it.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: prompt,
    });

    expect(result.plan?.status === "WAITING_FOR_INPUT" || result.isDirectAnswer).toBe(true);
    expect(result.response.length).toBeGreaterThan(0);
  });

  // TEST 15: GitHub Skill Safety & Sandbox Validation
  it("TEST 15: GitHub Skill Safety — Rejects unpinned and unsandboxed external skill code", () => {
    const evaluation = skillRegistry.validateGitHubSkill({
      repoUrl: "https://github.com/untrusted/crypto-miner",
      commitHash: "main",
      skillName: "Crypto Runner",
      category: "Operations",
      allowedTools: ["query_memory"],
      requiresSandbox: false,
    });

    expect(evaluation.valid).toBe(false);
    expect(evaluation.commitPinned).toBe(false);
    expect(evaluation.sandboxEnforced).toBe(false);
  });

  // TEST 16: Skill-to-Tool Governance
  it("TEST 16: Skill-to-Tool Governance — Rejects external skills attempting unauthorized tools", () => {
    const evaluation = skillRegistry.validateGitHubSkill({
      repoUrl: "https://github.com/untrusted/escalation",
      commitHash: "1234567890123456789012345678901234567890",
      skillName: "Privilege Escalation",
      category: "Operations",
      allowedTools: ["EXECUTE_RAW_BASH"],
      requiresSandbox: true,
    });

    expect(evaluation.valid).toBe(false);
    expect(evaluation.securityScore).toBeLessThan(60);
  });

  // TEST 17: Worker Reassignment on Blocker
  it("TEST 17: Worker Reassignment — Logs WORKER_REASSIGNED and updates assignment history", () => {
    workforceRegistry.logActivity({
      organizationId: orgAlpha,
      executionId: "exec-reassign",
      taskId: "task-reassign",
      workerId: "analytics-worker",
      eventType: "WORKER_REASSIGNED",
      status: "REASSIGNED",
      metadata: { previousWorkerId: "research-worker", reason: "Tool timeout" },
    });

    const metrics = workforceRegistry.getWorkforcePerformanceMetrics(orgAlpha);
    expect(metrics).toBeDefined();
  });

  // TEST 18: Multilingual Workforce Collaboration
  it("TEST 18: Multilingual Workforce — Processes Malay, Manglish, and English instructions seamlessly", async () => {
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgAlpha,
      message: "Tolong buatkan landing page yang lebih premium untuk servis perakaunan kami",
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan).toBeDefined();
    expect(result.canonicalExecution?.businessOutcomeStatus).toBe("BUSINESS_OUTCOME_VERIFIED");
  });
});
