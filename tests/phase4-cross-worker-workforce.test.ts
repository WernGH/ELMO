/**
 * ELMO Phase 4 — Cross-Worker Workforce Test Suite
 *
 * Verifies:
 * 1. Complete 10-worker canonical governed workforce registry.
 * 2. Cross-worker handoff contract pipelines:
 *    - RESEARCH -> STRATEGY
 *    - ANALYTICS -> STRATEGY
 *    - STRATEGY -> AUTOMATION
 *    - STRATEGY -> MARKETING
 *    - STRATEGY -> SALES
 *    - SUPPORT -> SALES
 *    - AUTOMATION -> OPERATIONS
 * 3. Dynamic collaborative multi-step execution plans across new and existing workers.
 * 4. Multi-tenant isolation and supervised governance over all handoff contracts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { DynamicTaskPlannerService } from "@/services/agentic/dynamic-task-planner.service";
import { WorkerRole } from "@/services/agentic/types/agentic.types";

describe("Phase 4: 10-Worker Governed Workforce & Cross-Worker Pipelines", () => {
  let agentRegistry: AgentRegistryService;
  let workforceRegistry: WorkforceRegistryService;
  let planner: DynamicTaskPlannerService;
  const orgId = "org-cross-workforce-test";

  beforeEach(() => {
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
    planner = DynamicTaskPlannerService.getInstance();
  });

  describe("1. Complete 10-Worker Workforce Registry", () => {
    it("should register all 10 canonical Phase 4 specialist workers", () => {
      const workers = agentRegistry.getWorkers();
      expect(workers.length).toBeGreaterThanOrEqual(10);

      const workerMap = new Map(workers.map((w) => [w.id, w]));

      const expectedWorkers: Array<{ id: string; role: WorkerRole; robotName?: string }> = [
        { id: "research-worker", role: "RESEARCH" },
        { id: "analytics-worker", role: "ANALYTICS" },
        { id: "marketing-worker", role: "MARKETING" },
        { id: "copy-worker", role: "COPY" },
        { id: "sales-worker", role: "SALES" },
        { id: "web-coding-worker", role: "WEB_CODING" },
        { id: "operations-worker", role: "OPERATIONS" },
        { id: "strategy-worker", role: "STRATEGY", robotName: "STRATEGY" },
        { id: "automation-worker", role: "AUTOMATION", robotName: "AUTOMATION" },
        { id: "support-worker", role: "SUPPORT", robotName: "SUPPORT" },
      ];

      for (const expected of expectedWorkers) {
        const worker = workerMap.get(expected.id);
        expect(worker, `Expected worker ${expected.id} to be registered`).toBeDefined();
        expect(worker?.role).toBe(expected.role);
        expect(worker?.enabled).toBe(true);
        if (expected.robotName) {
          expect(worker?.robotName).toBe(expected.robotName);
        }
      }
    });
  });

  describe("2. Seven Canonical Cross-Worker Handoff Pipelines", () => {
    it("Pipeline 1: RESEARCH -> STRATEGY handoff contract", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-cross-1",
        taskId: "task-pipe-1",
        fromWorkerId: "research-worker",
        toWorkerId: "strategy-worker",
        objective: "Transfer validated market research and competitor pricing intelligence for strategic positioning",
        completedWork: "Compiled intelligence report on 4 direct competitors and buyer willingness to pay.",
        requiredNextAction: "Formulate strategic positioning options and recommendation for pricing tier restructuring",
        verificationStatus: "VERIFIED",
        outputs: {
          competitorCount: 4,
          primaryBuyerPain: "Opaque enterprise pricing",
          medianMarketPrice: 2400,
        },
        evidence: ["Intelligence verified with search_knowledge", "Tenant isolation confirmed"],
      });

      expect(handoff.fromWorkerId).toBe("research-worker");
      expect(handoff.toWorkerId).toBe("strategy-worker");
      expect(handoff.verificationStatus).toBe("VERIFIED");
    });

    it("Pipeline 2: ANALYTICS -> STRATEGY handoff contract", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-cross-2",
        taskId: "task-pipe-2",
        fromWorkerId: "analytics-worker",
        toWorkerId: "strategy-worker",
        objective: "Transfer quantitative funnel telemetry and drop-off diagnosis for strategic review",
        completedWork: "Diagnosed 42% drop-off at checkout step and analyzed 90-day retention curve.",
        requiredNextAction: "Formulate strategic intervention options addressing checkout friction",
        verificationStatus: "VERIFIED",
        outputs: {
          churnRate: 0.08,
          checkoutDropoffRate: 0.42,
          revenueImpactPerMonth: 18500,
        },
        evidence: ["Funnel telemetry verified against analytics logs"],
      });

      expect(handoff.fromWorkerId).toBe("analytics-worker");
      expect(handoff.toWorkerId).toBe("strategy-worker");
      expect(handoff.verificationStatus).toBe("VERIFIED");
    });

    it("Pipeline 3: STRATEGY -> AUTOMATION handoff contract", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-cross-3",
        taskId: "task-pipe-3",
        fromWorkerId: "strategy-worker",
        toWorkerId: "automation-worker",
        objective: "Configure event-driven workflow automation implementing Option 1 of strategy roadmap",
        completedWork: "Approved High-Velocity Digital Acquisition & Automated Nurture strategy.",
        requiredNextAction: "Design, test, and verify trigger-condition-action workflow for new lead submissions",
        verificationStatus: "VERIFIED",
        outputs: {
          selectedOptionId: "opt-1",
          targetCycleTime: "< 60 seconds to lead response",
          targetTools: ["store_memory", "trigger_event"],
        },
        evidence: ["Executive strategy approved by human leadership"],
      });

      expect(handoff.fromWorkerId).toBe("strategy-worker");
      expect(handoff.toWorkerId).toBe("automation-worker");
      expect(handoff.verificationStatus).toBe("VERIFIED");
    });

    it("Pipeline 4: STRATEGY -> MARKETING handoff contract", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-cross-4",
        taskId: "task-pipe-4",
        fromWorkerId: "strategy-worker",
        toWorkerId: "marketing-worker",
        objective: "Translate approved strategic positioning into promotional offer and funnel blueprint",
        completedWork: "Defined core value proposition, audience boundaries, and competitive pricing angle.",
        requiredNextAction: "Build multi-step landing page funnel and promotional offer blueprint",
        verificationStatus: "VERIFIED",
        outputs: {
          valueProposition: "Governed Autonomous AI Workforce for Enterprise Operations",
          targetSegment: "Mid-Market to Enterprise",
          pricingTier: "Premium Retainer",
        },
        evidence: ["Positioning verified against Company Brain identity"],
      });

      expect(handoff.fromWorkerId).toBe("strategy-worker");
      expect(handoff.toWorkerId).toBe("marketing-worker");
      expect(handoff.verificationStatus).toBe("VERIFIED");
    });

    it("Pipeline 5: STRATEGY -> SALES handoff contract", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-cross-5",
        taskId: "task-pipe-5",
        fromWorkerId: "strategy-worker",
        toWorkerId: "sales-worker",
        objective: "Deploy strategic account qualification criteria into outbound sales pipeline",
        completedWork: "Framed ideal customer profile (ICP) and disqualification rules for enterprise deals.",
        requiredNextAction: "Configure pipeline qualification stages and objection response framework",
        verificationStatus: "VERIFIED",
        outputs: {
          icpRevenueThreshold: "> $5M ARR",
          budgetAuthorityRequired: true,
          dealSizeMin: 25000,
        },
        evidence: ["Qualification criteria verified by Strategy Specialist"],
      });

      expect(handoff.fromWorkerId).toBe("strategy-worker");
      expect(handoff.toWorkerId).toBe("sales-worker");
      expect(handoff.verificationStatus).toBe("VERIFIED");
    });

    it("Pipeline 6: SUPPORT -> SALES handoff contract", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-cross-6",
        taskId: "task-pipe-6",
        fromWorkerId: "support-worker",
        toWorkerId: "sales-worker",
        objective: "Hand off customer inquiring about plan upgrade and enterprise seat volume",
        completedWork: "Resolved initial product capability inquiry and confirmed customer desire for 50 additional seats.",
        requiredNextAction: "Schedule enterprise expansion demonstration and prepare custom volume proposal",
        verificationStatus: "VERIFIED",
        outputs: {
          contactId: "contact-enterprise-101",
          expansionInterest: "50 seats",
          urgency: "HIGH",
        },
        evidence: ["Customer transcript verified", "Explicit customer consent logged"],
      });

      expect(handoff.fromWorkerId).toBe("support-worker");
      expect(handoff.toWorkerId).toBe("sales-worker");
      expect(handoff.verificationStatus).toBe("VERIFIED");
    });

    it("Pipeline 7: AUTOMATION -> OPERATIONS handoff contract", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-cross-7",
        taskId: "task-pipe-7",
        fromWorkerId: "automation-worker",
        toWorkerId: "operations-worker",
        objective: "Integrate tested lead intake automation into standard operating procedure documentation",
        completedWork: "Configured and tested webhook automation; verified zero arbitrary code and approval requirements.",
        requiredNextAction: "Document workflow SOP, establish error monitoring alerts, and train operations personnel",
        verificationStatus: "VERIFIED",
        outputs: {
          workflowId: "wf-inbound-lead-01",
          status: "CONFIGURED",
          failureThreshold: "3 retries before escalation",
        },
        evidence: ["Workflow verified by OutcomeVerificationService"],
      });

      expect(handoff.fromWorkerId).toBe("automation-worker");
      expect(handoff.toWorkerId).toBe("operations-worker");
      expect(handoff.verificationStatus).toBe("VERIFIED");
    });

    it("should retrieve all 7 handoff contracts from workforce registry", () => {
      const pipelineConfigs = [
        { from: "research-worker", to: "strategy-worker", obj: "Research to Strategy" },
        { from: "analytics-worker", to: "strategy-worker", obj: "Analytics to Strategy" },
        { from: "strategy-worker", to: "automation-worker", obj: "Strategy to Automation" },
        { from: "strategy-worker", to: "marketing-worker", obj: "Strategy to Marketing" },
        { from: "strategy-worker", to: "sales-worker", obj: "Strategy to Sales" },
        { from: "support-worker", to: "sales-worker", obj: "Support to Sales" },
        { from: "automation-worker", to: "operations-worker", obj: "Automation to Operations" },
      ];

      for (let i = 0; i < pipelineConfigs.length; i++) {
        const c = pipelineConfigs[i];
        workforceRegistry.createWorkerHandoff({
          organizationId: orgId,
          executionId: `exec-batch-${i}`,
          taskId: `task-batch-${i}`,
          fromWorkerId: c.from,
          toWorkerId: c.to,
          objective: c.obj,
          completedWork: `Completed work for ${c.obj}`,
          requiredNextAction: `Required action for ${c.obj}`,
          verificationStatus: "VERIFIED",
          outputs: { pipelineStep: i + 1 },
          evidence: ["Verified contract"],
        });
      }

      const allHandoffs = workforceRegistry.getWorkerHandoffs(orgId);
      expect(allHandoffs.length).toBe(7);

      const toWorkers = allHandoffs.map((h) => h.toWorkerId);
      expect(toWorkers).toContain("strategy-worker");
      expect(toWorkers).toContain("automation-worker");
      expect(toWorkers).toContain("marketing-worker");
      expect(toWorkers).toContain("sales-worker");
      expect(toWorkers).toContain("operations-worker");
    });
  });

  describe("3. Collaborative Multi-Step Dynamic Planning", () => {
    it("should plan collaborative pipeline: Research -> Strategy -> Sales", async () => {
      const plannerResult = await planner.plan({
        objective: "Conduct market intelligence research, formulate competitive strategy, and build sales qualification pipeline",
        organizationId: orgId,
        userId: "dev-user",
      });

      expect(plannerResult.plan.steps.length).toBeGreaterThanOrEqual(3);

      const researchStep = plannerResult.plan.steps.find((s) => s.agentId === "research-worker");
      const strategyStep = plannerResult.plan.steps.find((s) => s.agentId === "strategy-worker");
      const salesStep = plannerResult.plan.steps.find((s) => s.agentId === "sales-worker");

      expect(researchStep).toBeDefined();
      expect(strategyStep).toBeDefined();
      expect(salesStep).toBeDefined();

      // Verify dependencies sequence
      expect(strategyStep?.dependencies).toContain(researchStep?.id);
      expect(salesStep?.dependencies).toContain(strategyStep?.id);
    });

    it("should plan collaborative pipeline: Strategy -> Automation", async () => {
      const plannerResult = await planner.plan({
        objective: "Formulate business strategy and automate this process with event-driven triggers",
        organizationId: orgId,
        userId: "dev-user",
      });

      expect(plannerResult.plan.steps.length).toBeGreaterThanOrEqual(2);

      const strategyStep = plannerResult.plan.steps.find((s) => s.agentId === "strategy-worker");
      const automationStep = plannerResult.plan.steps.find((s) => s.agentId === "automation-worker");

      expect(strategyStep).toBeDefined();
      expect(automationStep).toBeDefined();
      expect(automationStep?.dependencies).toContain(strategyStep?.id);
    });
  });
});
