/**
 * ELMO Phase 4 — Strategy Worker Test Suite
 *
 * Verifies:
 * 1. Strategy Worker registration, capabilities, tools, and robot identity.
 * 2. Transparent alias resolution (strategy-agent -> strategy-worker).
 * 3. Strategy Specialist Agent execution with Company Brain grounding.
 * 4. Structured StrategyWorkerOutput schema compliance.
 * 5. Semantic task planning and routing without keyword matching.
 * 6. Outcome verification rules for strategic decisions.
 * 7. Inter-worker handoff contract creation and verification.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { StrategyAgent } from "@/services/agentic/specialists/strategy-agent";
import { DynamicTaskPlannerService } from "@/services/agentic/dynamic-task-planner.service";
import { OutcomeVerificationService } from "@/services/agentic/outcome-verification.service";
import { ToolRegistryService } from "@/services/agentic/tool-registry.service";
import { StrategyWorkerOutput, ExecutionContext } from "@/services/agentic/types/agentic.types";

describe("Phase 4: Strategy Worker Extension", () => {
  let agentRegistry: AgentRegistryService;
  let workforceRegistry: WorkforceRegistryService;
  let planner: DynamicTaskPlannerService;
  let outcomeVerifier: OutcomeVerificationService;
  let strategyAgent: StrategyAgent;
  const orgId = "org-strategy-test";

  beforeEach(() => {
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
    planner = DynamicTaskPlannerService.getInstance();
    outcomeVerifier = OutcomeVerificationService.getInstance();
    strategyAgent = StrategyAgent.getInstance();
  });

  describe("1. Worker Registration & Identity", () => {
    it("should register strategy-worker with STRATEGY role and robotName", () => {
      const worker = agentRegistry.getWorker("strategy-worker");
      expect(worker).toBeDefined();
      expect(worker?.id).toBe("strategy-worker");
      expect(worker?.role).toBe("STRATEGY");
      expect(worker?.robotName).toBe("STRATEGY");
      expect(worker?.enabled).toBe(true);
      expect(worker?.capabilities).toContain("strategic_planning");
      expect(worker?.capabilities).toContain("option_generation");
      expect(worker?.capabilities).toContain("tradeoff_analysis");
      expect(worker?.capabilities).toContain("risk_assessment");
      expect(worker?.capabilities).toContain("dependency_mapping");
      expect(worker?.capabilities).toContain("decision_framing");
    });

    it("should resolve aliases between strategy-agent and strategy-worker", () => {
      expect(agentRegistry.resolveWorkerAlias("strategy-agent")).toBe("strategy-worker");
      expect(agentRegistry.resolveWorkerAlias("strategy-worker")).toBe("strategy-worker");

      const agent = agentRegistry.getAgent("strategy-agent");
      const worker = agentRegistry.getWorker("strategy-worker");
      expect(agent).toBeDefined();
      expect(worker).toBeDefined();
      expect(agent?.role).toBe("STRATEGY");
      expect(worker?.role).toBe("STRATEGY");
    });

    it("should enforce authorized tools for Strategy Worker", () => {
      const worker = agentRegistry.getWorker("strategy-worker");
      expect(worker?.allowedTools).toContain("query_company_brain");
      expect(worker?.allowedTools).toContain("query_market_data");
      expect(worker?.allowedTools).toContain("read_resource");
      expect(worker?.allowedTools).toContain("create_handoff_contract");

      // Verify ToolRegistry validates tool calls for strategy worker
      const toolRegistry = ToolRegistryService.getInstance();
      const validation = toolRegistry.validateToolCall("strategy-worker", "query_company_brain", {});
      expect(validation.allowed).toBe(true);

      // Verify destructive / arbitrary tools are not permitted
      const invalidValidation = toolRegistry.validateToolCall("strategy-worker", "execute_code", {});
      expect(invalidValidation.allowed).toBe(false);
    });
  });

  describe("2. Specialist Execution & Structured Contract Output", () => {
    it("should execute strategic evaluation and produce structured options with tradeoffs", async () => {
      const context: ExecutionContext = {
        taskId: "task-strat-001",
        organizationId: orgId,
        agentId: "strategy-worker",
        channel: "web",
        permissions: ["strategy:read", "strategy:write"],
        sessionData: {
          companyContext: "B2B SaaS with high retention but saturated mid-market channel.",
        },
      };

      function createTestMessage(task: string, ctx: Record<string, unknown> = {}): any {
        return {
          messageId: `msg-${Date.now()}`,
          executionId: "exec-strat-001",
          sender: "test-runner",
          recipient: "strategy-worker",
          messageType: "TASK_ASSIGNMENT",
          task,
          context: ctx,
          input: {},
          timestamp: Date.now(),
        };
      }

      const result = await strategyAgent.execute(createTestMessage(
        "Formulate market penetration options and recommend expansion path for enterprise tier",
        context
      ));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const output = result.data as unknown as StrategyWorkerOutput;
      expect(output.problem).toBeDefined();
      expect(output.desiredOutcome).toBeDefined();
      expect(Array.isArray(output.strategicOptions)).toBe(true);
      expect(output.strategicOptions.length).toBeGreaterThanOrEqual(2);

      // Verify options contain tradeoffs
      for (const opt of output.strategicOptions) {
        expect(opt.id).toBeDefined();
        expect(opt.title).toBeDefined();
        expect(opt.description).toBeDefined();
        expect(Array.isArray(opt.pros)).toBe(true);
        expect(Array.isArray(opt.cons)).toBe(true);
        expect(Array.isArray(opt.tradeoffs)).toBe(true);
        expect(opt.pros.length).toBeGreaterThan(0);
        expect(opt.cons.length).toBeGreaterThan(0);
      }

      // Verify recommended next actions
      expect(Array.isArray(output.recommendedNextActions)).toBe(true);
      expect(output.recommendedNextActions.length).toBeGreaterThan(0);

      // Verify risks & dependencies
      expect(Array.isArray(output.risks)).toBe(true);
      expect(output.risks.length).toBeGreaterThan(0);
      expect(Array.isArray(output.dependencies)).toBe(true);
      expect(output.dependencies.length).toBeGreaterThan(0);
    });
  });

  describe("3. Dynamic Semantic Planning (Zero Keyword Routing)", () => {
    it("should dynamically select strategy-worker based on semantic intent and capabilities", async () => {
      const plannerResult = await planner.plan({
        objective: "Conduct competitive positioning analysis and outline strategic pathways with tradeoff scenarios",
        organizationId: orgId,
        userId: "dev-user",
      });

      expect(plannerResult).toBeDefined();
      expect(plannerResult.plan).toBeDefined();
      expect(plannerResult.plan.steps.length).toBeGreaterThanOrEqual(1);

      // Verify step was assigned to strategy-worker based on capability, not keyword
      const strategyStep = plannerResult.plan.steps.find((s) => s.agentId === "strategy-worker");
      expect(strategyStep).toBeDefined();
      expect(strategyStep?.skills).toBeDefined();
      expect(strategyStep?.skills?.length).toBeGreaterThan(0);
    });

    it("should formulate multi-step collaborative plan from Research to Strategy", async () => {
      const plannerResult = await planner.plan({
        objective: "Conduct market intelligence research on emerging enterprise SaaS trends and formulate strategic positioning options",
        organizationId: orgId,
        userId: "dev-user",
      });

      expect(plannerResult.plan.steps.length).toBeGreaterThanOrEqual(2);
      const researchStep = plannerResult.plan.steps.find((s) => s.agentId === "research-worker");
      const strategyStep = plannerResult.plan.steps.find((s) => s.agentId === "strategy-worker");

      expect(researchStep).toBeDefined();
      expect(strategyStep).toBeDefined();
    });
  });

  describe("4. Outcome Verification & Governance", () => {
    it("should pass verification when Strategy output meets all governance criteria", async () => {
      const validStrategyOutput: StrategyWorkerOutput = {
        problem: "Enterprise Expansion",
        desiredOutcome: "Establish footprint in Fortune 500 tier",
        findings: ["Current growth is 12% in SMB, 0% enterprise presence."],
        strategicOptions: [
          {
            id: "opt-1",
            title: "Direct Outbound Enterprise Sales",
            description: "Hire dedicated AE pods targeting Tier 1 accounts.",
            pros: ["High deal value", "Direct feedback loop"],
            cons: ["High initial CAC", "Long sales cycle"],
            tradeoffs: ["Capital efficiency vs speed of enterprise penetration"],
            expectedImpact: "High",
            riskLevel: "MEDIUM",
          },
          {
            id: "opt-2",
            title: "Channel Partner Ecosystem",
            description: "Partner with regional systems integrators.",
            pros: ["Faster coverage", "Shared risk"],
            cons: ["Lower margins", "Partner enablement lag"],
            tradeoffs: ["Margin retention vs immediate distribution"],
            expectedImpact: "Medium",
            riskLevel: "LOW",
          },
        ],
        recommendedNextActions: [
          "Deploy Sales worker for enterprise ICP qualification",
          "Deploy Marketing worker for enterprise collateral",
        ],
        requiredWorkers: ["sales-worker", "marketing-worker"],
        dependencies: [
          { task: "SOC2 Certification", dependsOn: "Security Audit" },
          { task: "Enterprise pricing deck", dependsOn: "Strategy" },
        ],
        risks: [
          {
            risk: "Long sales cycles may constrain cash flow",
            mitigation: "Require 50% upfront deposits on annual agreements",
            severity: "MEDIUM",
          },
        ],
        assumptions: ["Enterprise buyers demand SLA commitments"],
        verificationCriteria: ["Options must clearly distinguish pros, cons, and tradeoffs"],
      };

      const step = {
        id: "step-strat-1",
        name: "Formulate enterprise strategy",
        agentId: "strategy-worker",
        status: "COMPLETED" as const,
      };

      const verification = outcomeVerifier.verifyStepOutcome(step as any, validStrategyOutput as any, {
        organizationId: orgId,
      });

      expect(verification.success).toBe(true);
      expect(verification.business.passed).toBe(true);
      expect(verification.business.checks.some((c) => c.check === "strategic_options_generated" && c.passed)).toBe(true);
      expect(verification.business.checks.some((c) => c.check === "actionable_recommendations_present" && c.passed)).toBe(true);
    });

    it("should fail verification when Strategy output lacks multiple options or recommendations", async () => {
      const deficientOutput = {
        problem: "Quick win",
        strategicOptions: [], // Missing options
        recommendedNextActions: [], // Missing recommendations
      };

      const step = {
        id: "step-strat-fail",
        name: "Formulate strategy",
        agentId: "strategy-worker",
        status: "COMPLETED" as const,
      };

      const verification = outcomeVerifier.verifyStepOutcome(step as any, deficientOutput as any, {
        organizationId: orgId,
      });

      expect(verification.success).toBe(false);
      expect(verification.defects.length).toBeGreaterThan(0);
    });
  });

  describe("5. Inter-Worker Handoff Contract", () => {
    it("should create and register a verified handoff contract from Strategy Worker to Marketing Worker", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-strat-handoff-1",
        taskId: "task-strat-001",
        fromWorkerId: "strategy-worker",
        toWorkerId: "marketing-worker",
        objective: "Execute campaign aligned with direct enterprise outreach strategy",
        completedWork: "Defined ICP, positioning angles, and multi-tier messaging guidelines.",
        requiredNextAction: "Build multi-channel enterprise demand generation campaign",
        verificationStatus: "VERIFIED",
        outputs: {
          recommendedStrategy: "Direct Outbound Enterprise Sales",
          targetTier: "Tier 1 Enterprise",
          keyDifferentiators: ["AI Governance", "Audit Trail Verification"],
        },
        evidence: [
          "Strategy output verified by OutcomeVerificationService",
          "Executive rationale validated against Company Brain",
        ],
      });

      expect(handoff).toBeDefined();
      expect(handoff.handoffId).toMatch(/^hoff-/);
      expect(handoff.verificationStatus).toBe("VERIFIED");
      expect(handoff.fromWorkerId).toBe("strategy-worker");
      expect(handoff.toWorkerId).toBe("marketing-worker");

      // Verify presence in workforce handoff registry
      const storedHandoffs = workforceRegistry.getWorkerHandoffs(orgId);
      const found = storedHandoffs.find((h) => h.handoffId === handoff.handoffId);
      expect(found).toBeDefined();
      expect(found?.outputs.recommendedStrategy).toBe("Direct Outbound Enterprise Sales");
    });
  });
});
